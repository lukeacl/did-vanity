import { Secp256k1PrivateKeyExportable } from "@atcute/crypto";
import { signOperation, deriveDidFromGenesisOp } from "@atcute/did-plc";

self.onmessage = async function (e) {
  //console.log("Worker; Starting;", e.data);
  while (true) {
    const signingKey = await Secp256k1PrivateKeyExportable.createKeypair();
    const recoveryKey = await Secp256k1PrivateKeyExportable.createKeypair();
    const rotationKey = await Secp256k1PrivateKeyExportable.createKeypair();

    const op = {
      type: "plc_operation",
      prev: null,
      alsoKnownAs: ["at://handle.pds.private"],
      rotationKeys: [
        await recoveryKey.exportPublicKey("did"),
        await rotationKey.exportPublicKey("did"),
      ],
      verificationMethods: {
        atproto: await signingKey.exportPublicKey("did"),
      },
      services: {
        atproto_pds: {
          type: "AtprotoPersonalDataServer",
          endpoint: "https://pds.private",
        },
      },
    };

    const signedOp = await signOperation(op, rotationKey);
    const did = await deriveDidFromGenesisOp(signedOp);

    self.postMessage({
      did,
      op,
      signedOp,
      recoveryKey: {
        did: await recoveryKey.exportPublicKey("did"),
        key: await recoveryKey.exportPrivateKey("multikey"),
      },
      date: new Date(),
    });
  }
};
