console.log({ window })

const { assignKey, getPublicKey, getPrivateKey } = window.newfang.default;

const idtokenField = document.getElementById("idtoken")
const verifierField = document.getElementById("verifier")
const emailField = document.getElementById("email")

verifierField.value = "google"
emailField.value = "makyl@newfang.io"
// assignKey(verifier, id).then(res => {
//     console.log({ assignKey: res })
// })
// getPublicKey(verifier, id).then(res => {
//     console.log({ pk: res })
// })
// getShares({ verifier: "google", idToken: idtokenField.value }).then(res => {
//     console.log({ res })
// })

const assignButton = document.getElementById("assign")
const getPvtKeyButton = document.getElementById("getPvtKey")
const getPubKeyButton = document.getElementById("getPubKey")

assignButton.addEventListener("click", function () {
    if (verifierField.value && emailField.value) {
        assignKey(verifierField.value, emailField.value).then(res => {
            console.log({ assignKey: res })
            console.log("Assign success?")
        })
    }
})

getPubKeyButton.addEventListener("click", function () {
    if (verifierField.value && emailField.value) {
        getPublicKey(verifierField.value, emailField.value).then(res => {
            console.log({ PubKey: res })
        })
    }
})

getPvtKeyButton.addEventListener("click", function () {
    if (verifierField.value && emailField.value && idtokenField.value) {
        getPrivateKey({ id:emailField.value, verifier: verifierField.value, idToken: idtokenField.value }).then(res => {
            console.log({ res })
        }).catch(e => console.log({ error: e}))
    }
})