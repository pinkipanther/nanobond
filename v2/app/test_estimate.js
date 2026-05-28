const { createPublicClient, http, parseEther } = require('viem');
const { hederaTestnet } = require('viem/chains');

const client = createPublicClient({
  chain: hederaTestnet,
  transport: http('https://testnet.hashio.io/api')
});

const ABI = [{
  "inputs": [
    { "internalType": "string", "name": "_name", "type": "string" },
    { "internalType": "string", "name": "_symbol", "type": "string" },
    { "internalType": "uint256", "name": "_totalSupply", "type": "uint256" },
    { "internalType": "uint256", "name": "_hardCap", "type": "uint256" },
    { "internalType": "uint256", "name": "_softCap", "type": "uint256" },
    { "internalType": "uint256", "name": "_launchDuration", "type": "uint256" },
    { "internalType": "uint256", "name": "_lpPercent", "type": "uint256" },
    { "internalType": "uint256", "name": "_stakingRewardPercent", "type": "uint256" },
    { "internalType": "uint256", "name": "_stakingDuration", "type": "uint256" }
  ],
  "name": "createLaunch",
  "outputs": [
    { "internalType": "uint256", "name": "launchId", "type": "uint256" },
    { "internalType": "address", "name": "launchAddr", "type": "address" },
    { "internalType": "address", "name": "stakingAddr", "type": "address" }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
}];

async function main() {
  try {
    const gas = await client.estimateContractGas({
      address: '0x5fD07eF11E9613910bBf5d6Fd6d5523e4ef21DFD',
      abi: ABI,
      functionName: 'createLaunch',
      args: [
        "NEBU",
        "NEBU",
        parseEther("1000000000"),
        parseEther("100000"),
        parseEther("25000"),
        604800n,
        5000n,
        0n,
        0n
      ],
      account: '0x508673a40ACB491444E29E98BEb4A9a32f38636e' // using deployer as mock caller
    });
    console.log("Estimated gas:", gas);
  } catch (e) {
    console.error("Error estimating gas:", e.message);
  }
}
main();
