import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, governance } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const initialThreshold = 2;

  const coordinator = governance || deployer;

  const deployment = await deploy("TempestSentinel", {
    from: deployer,
    args: [coordinator, initialThreshold],
    log: true,
  });

  log(`TempestSentinel deployed at ${deployment.address}`);
};

export default func;
func.tags = ["TempestSentinel"];
func.id = "deploy_tempest_sentinel";


