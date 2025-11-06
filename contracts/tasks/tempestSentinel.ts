import { task } from "hardhat/config";

task("tempestSentinel:auditors", "列出当前启用的审阅员账户").setAction(
  async (_args, hre) => {
    const { deployments, ethers } = hre;
    const deployment = await deployments.get("TempestSentinel");
    const contract = await ethers.getContractAt("TempestSentinel", deployment.address);

    const signers = await ethers.getSigners();
    console.log("已启用的审阅员:");
    for (const signer of signers) {
      const info = await contract.auditors(signer.address);
      if (info.enabled) {
        console.log(`  ${signer.address} ✅`);
      }
    }
  }
);


