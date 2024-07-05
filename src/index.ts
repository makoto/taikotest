import { JsonFragment } from "@ethersproject/abi";
import { utils, Contract, providers } from "ethers";
import { toBeHex, } from "ethersv6";
const  proofabi = require('./proofabi.json');
const taikol1abi = require('./taikol1abi.json');

async function main() {
  // Should return `Satoshi`
  // const slots = [1n];
  // Should return `Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.`
  const manyslots = [
    [1n],
    [0n],
    [113954284439379568356835236927765863356281035305576447217289829901226428694864n],
    [
      72984518589826227531578991903372844090998219903258077796093728159832249402700n,
      20078987066573592807830010549854483640024192519558332002348594298392865432561n,
      20078987066573592807830010549854483640024192519558332002348594298392865432562n
    ],
    [
      0n,
      19113468023177087480137164197276224628545241273019494438294250737918711734711n
    ],
    [
      1n,
      73632549742304026141220915744082581999429809011486182419306676950433691627133n  
    ]
  ];
  // https://github.com/ensdomains/evmgateway/blob/main/op-verifier/contracts/test/TestL2.sol
  const testL2Address = '0x5F5e99139a17c56eadC3B1d01535224d003B7E5b'
  const account = testL2Address;

  // Note that currently, the public rpc does not support `eth_getProof` method.
  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const l1provider = new providers.JsonRpcProvider(L1_PROVIDER_URL);
  const l2provider = new providers.JsonRpcProvider("https://rpc.hekla.taiko.xyz/");

  for (let j = 0; j < manyslots.length; j++) {
    const slots = manyslots[j];
    const hexSlots = slots.map((slot) => toBeHex(slot, 32))

    // https://holesky.etherscan.io/address/0x79C9109b764609df928d16fC4a91e9081F7e87DB#readProxyContract
    const verifier = new Contract("0x79C9109b764609df928d16fC4a91e9081F7e87DB", taikol1abi, l1provider);
    // https://github.com/taikoxyz/taiko-mono/blob/main/packages/protocol/contracts/L1/TaikoL1.sol#L201
    const {blockId_, blockHash_, stateRoot_} = await verifier.getLastSyncedBlock()
    console.log('getLastSyncedBlock response', {blockId_:blockId_.toNumber(), blockHash_, stateRoot_})
    const hexBlockId = blockId_.toHexString().replace('0x0', '0x')
    const proof = await l2provider.send("eth_getProof", [account, hexSlots, hexBlockId]);
    // Code from https://etherscan.io/address/0x56b0d8d04de22f2539945258ddb288c123026775#code
    const merkleproof = new Contract("0x5f5e99139a17c56eadc3b1d01535224d003b7e5b", proofabi, l1provider);

    for (let index = 0; index < proof['storageProof'].length; index++) {
      const storageProof = proof['storageProof'][index];
      const value = Buffer.from(storageProof['value'].slice(2), "hex").toString("utf8");
      console.log(`Verifying `, value)
      console.log('Calling verifyMerkleProof with', [
        stateRoot_,
        account,
        storageProof['key'],
        utils.hexZeroPad(storageProof['value'], 32),
        proof['accountProof'],
        storageProof['proof']
      ])
      const storageHash = await merkleproof.verifyMerkleProof(
        stateRoot_,
        account,
        storageProof['key'],
        utils.hexZeroPad(storageProof['value'], 32),
        proof['accountProof'],
        storageProof['proof']
      )
      console.log(`value:${value}, expected:${proof['storageHash']}, actual:${storageHash}, match:`,proof['storageHash'] === storageHash)
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
