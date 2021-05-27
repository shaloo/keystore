const serverConfig = require('../webpack.config');
const webpack = require('webpack');

function generate_build(callback) {
    const compiler = webpack(serverConfig());
    compiler.run(callback);
};


generate_build((err , stats) => {
    console.log({ err, stats })
    console.log(stats.compilation.errors)
});
