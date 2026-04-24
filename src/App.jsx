import { Secp256k1PrivateKeyExportable } from "@atcute/crypto";
import {
  signOperation,
  deriveDidFromGenesisOp,
  PlcClient,
} from "@atcute/did-plc";
import { useState, useEffect } from "react";

import searching from "./assets/searching.gif";

function App() {
  const [patternString, setPatternString] = useState("alf");
  const [isSearching, setIsSearching] = useState(false);

  const [candidate, setCandidate] = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [created, setIsCreated] = useState(null);

  useEffect(() => {
    let intervalId;
    if (isSearching) {
      intervalId = setInterval(async () => {
        const pattern = new RegExp(patternString, "i");

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

        if (pattern.test(did.substring(8))) {
          setCandidate({
            pattern,
            did,
            op,
            signedOp,
            recoveryKey: {
              did: await recoveryKey.exportPublicKey("did"),
              key: await recoveryKey.exportPrivateKey("multikey"),
            },
            date: new Date(),
          });

          setIsSearching(false);
        }
      }, 0);
    }

    return () => clearInterval(intervalId);
  }, [isSearching, patternString]);

  const onSearch = async () => {
    setCandidate(null);
    setIsSearching(true);
  };

  const onSubmit = async () => {
    if (confirm("Are you sure you'd like to create this DID?")) {
      setIsCreating(true);
      try {
        const client = new PlcClient();
        await client.submitOperation(candidate.did, candidate.signedOp);
        setIsCreated(candidate);
      } catch (error) {
        alert(error.message || error);
      }
      setIsCreating(false);
    }
  };

  const onReset = () => {
    setCandidate(null);
  };

  return (
    <>
      <div className="flex flex-col mx-2 my-4">
        <div className="text-center m-auto max-w-lg">
          <h1>did:vanity</h1>

          {!created ? (
            <>
              {!candidate ? (
                <>
                  {!isSearching ? (
                    <>
                      <p className="mt-1 font-thin">
                        Some of us are mad enough to want to generate a did:plc
                        that contains a specific sequence of characters. For
                        what reason? Unknown, but this tool will help you out!
                      </p>
                      <h2 className="mt-4">Search</h2>
                      <div className="mt-4">
                        <input
                          className="mr-2"
                          placeholder="Pattern"
                          type="text"
                          value={patternString}
                          onChange={(e) => setPatternString(e.target.value)}
                        />
                        <button onClick={onSearch}>Search</button>
                      </div>
                      <h2 className="mt-4">Pattern Information</h2>
                      <p className="mt-1 font-thin">
                        The search pattern can be provided as a regular
                        expression or simple text. For example "alf" will find
                        DIDs that contain the letters "alf", "^alf" will find
                        DIDs that start with the letters "alf", and "alf$" will
                        find DIDs that end with the letters "alf".
                      </p>
                      <h2 className="mt-4">Important Information</h2>
                      <p className="mt-1 font-thin">
                        Okay so now also hold up just one more moment, important
                        note, this is a single threaded operation. It's going to
                        take a while if your search pattern is specific. It's
                        going to be mega slow if you're really specific. To see
                        what it looks like quickly clear the pattern box and hit
                        Search. Otherwise, you need to be patient, go get some
                        coffee, an energy drink, put on some music, just vibe
                        and wait.
                      </p>
                    </>
                  ) : (
                    <div>
                      <img
                        src={searching}
                        alt="Searching..."
                        className="max-h-50 w-auto rounded-2xl shadow"
                      />
                      <button
                        className="mt-4"
                        onClick={() => setIsSearching(false)}
                      >
                        Woah! Stop bestie!
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-lg">{candidate.did}</p>
                  <div className="mt-4">
                    <button
                      className="mr-2"
                      onClick={onSubmit}
                      disabled={isCreating}
                    >
                      Create
                    </button>
                    <button onClick={onReset} disabled={isCreating}>
                      Reset
                    </button>
                  </div>
                  <p className="mt-4 font-thin">
                    When you press Create a genesis operation will be submitted
                    to the{" "}
                    <a href="https://plc.directory" target="_blank">
                      plc.directory
                    </a>{" "}
                    to create the DID. You will be provided with a recovery key
                    so you can manipulate it as required in the future.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="mb-2 font-thin">
                <a
                  href={`https://plc.directory/${candidate.did}/data`}
                  target="_blank"
                >
                  view on plc.directory
                </a>
              </p>
              <p className="text-lg font-semibold">{candidate.did}</p>
              <p className="mt-1">{candidate.recoveryKey.did}</p>
              <p className="">{candidate.recoveryKey.key}</p>
              <p className="mt-2 font-thin">
                This DID has been created. Make sure you save the recovery DID
                and Key below. You'll need this to modify the record later.
              </p>
            </>
          )}

          <p className="mt-8 font-thin text-sm">
            💕{" "}
            <a
              href="https://bsky.app/profile/did:plc:mfl5calppp7zoa44zt6pymie"
              target="_blank"
            >
              @lukeacl.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

export default App;
