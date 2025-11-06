import hre from "hardhat";

const { ethers, getNamedAccounts, deployments } = hre;

const TARGET_AUDITOR = ethers.getAddress("0x976ea74026e726554db657fa54763abd0c3a0aa9");

async function main() {
  const { governance, deployer } = await getNamedAccounts();
  const signerAddress = governance ?? deployer;
  if (!signerAddress) {
    throw new Error("No signer available to configure auditor");
  }

  const signer = await ethers.getSigner(signerAddress);
  const deployment = await deployments.get("TempestSentinel");
  const tempestSentinel = await ethers.getContractAt("TempestSentinel", deployment.address, signer);
  const tx = await tempestSentinel.configureAuditor(TARGET_AUDITOR as `0x${string}`, true);
  await tx.wait();

  console.log(`Auditor ${TARGET_AUDITOR} enabled by ${await signer.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

