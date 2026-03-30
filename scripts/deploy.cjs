const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const DisasterRelief = await hre.ethers.getContractFactory("DisasterRelief");
  // The contract now takes an initialOwner address in the constructor
  const contract = await DisasterRelief.deploy(deployer.address);

  await contract.waitForDeployment();

  console.log("DisasterRelief deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
