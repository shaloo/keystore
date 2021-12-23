import { ethers } from 'ethers';
import Config from './config';

export type network = 'test' | 'testnet';

interface BlockchainConfig {
  providerUrl: string;
  contractAddress: string;
}

const ChainConfig: { [k in network]: BlockchainConfig } = {
  test: Config.TEST_CONFIG,
  testnet: Config.TESTNET_CONFIG,
};

class NodeList {
  private network: network;
  private nodes: string[] = [];
  private indexes: number[] = [];
  private contract: ethers.Contract;
  constructor(network: network) {
    if (network in ChainConfig) {
      this.network = network;
      this.contract = getNodeContract(this.network);
    } else {
      const validNetworks = Object.keys(ChainConfig);
      throw new Error(`Invalid networks. Use ${validNetworks}`);
    }
  }

  public async getNodes(): Promise<{
    nodes: string[];
    indexes: number[];
  }> {
    if (this.nodes.length) {
      return { nodes: this.nodes, indexes: this.indexes };
    } else {
      const { nodes, indexes } = await this.fetchNodes();
      this.nodes = nodes;
      this.indexes = indexes;
      return { nodes, indexes };
    }
  }

  private async fetchNodes() {
    const nodes: string[] = [];
    const indexes: number[] = [];
    const promises = [];

    const epochInfo = await this.contract.functions.getEpochInfo(1);
    epochInfo.nodeList.forEach((node: string) => {
      promises.push(this.contract.functions.getNodeDetails(node));
    });

    const result = await Promise.all(promises);

    for (let i = 0; i < result.length; i++) {
      nodes.push(`https://${result[i].declaredIp}/rpc`);
      indexes.push(result[i].position.toNumber());
    }

    return { nodes, indexes };
  }
}

const getNodeContract = (network: network) => {
  const { providerUrl, contractAddress } = ChainConfig[network];
  const abi = [
    'function getEpochInfo(uint256 epoch) external view returns ( uint256 id, uint256 n, uint256 k, uint256 t, address[] memory nodeList, uint256 prevEpoch, uint256 nextEpoch)',
    'function getNodeDetails(address nodeAddress) external view returns ( string memory declaredIp, uint256 position, string memory tmP2PListenAddress, string memory p2pListenAddress)',
  ];
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  return contract;
};
export default NodeList;
