import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("TempestSentinel", () => {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  before(async () => {
    const signers = await ethers.getSigners();
    [deployer, alice, bob, carol] = signers;
  });

  it("logs encrypted pulse and reaches verified threshold", async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const factory = await ethers.getContractFactory("TempestSentinel");
    const contract = await factory.deploy(deployer.address, 2);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    await contract.connect(deployer).configureAuditor(bob.address, true);
    await contract.connect(deployer).configureAuditor(carol.address, true);

    const intensityInput = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .add32(7200)
      .encrypt();
    const precipitationInput = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .add64(13500n)
      .encrypt();
    const mediaInput = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .addBool(true)
      .encrypt();

    const locationHash = ethers.solidityPackedKeccak256(["string"], ["shanghai-pudong:blur=5km"]);
    const sensorHash = ethers.solidityPackedKeccak256(["string"], ['{"device":"WX-01","gust":32.5}']);

    const tx = await contract
      .connect(alice)
      .logPulse(
        1,
        locationHash,
        "ipfs://evidence",
        sensorHash,
        intensityInput.handles[0],
        intensityInput.inputProof,
        precipitationInput.handles[0],
        precipitationInput.inputProof,
        mediaInput.handles[0],
        mediaInput.inputProof
      );
    await tx.wait();

    const record = await contract.getPulse(1);
    expect(record.submitter).to.equal(alice.address);
    expect(record.status).to.equal(0);
    expect(record.approveCount).to.equal(0);

    const decryptedIntensity = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      record.encryptedIntensity,
      contractAddress,
      alice
    );
    const decryptedPrecipitation = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      record.encryptedPrecipitation,
      contractAddress,
      alice
    );
    const decryptedHasMedia =
      // @ts-expect-error: userDecryptEbool may exist in newer plugin versions
      typeof (fhevm as any).userDecryptEbool === "function"
        ? // @ts-expect-error: dynamic method
          await (fhevm as any).userDecryptEbool(
            record.encryptedHasMediaKey,
            contractAddress,
            alice
          )
        : await fhevm.userDecryptEuint(
            FhevmType.ebool,
            record.encryptedHasMediaKey,
            contractAddress,
            alice
          );

    expect(decryptedIntensity).to.equal(7200);
    expect(decryptedPrecipitation).to.equal(13500n);
    expect(decryptedHasMedia).to.equal(true);

    await expect(contract.connect(bob).reviewPulse(1, true, "ipfs://verify-1")).to.emit(
      contract,
      "PulseReviewed"
    );
    await expect(contract.connect(carol).reviewPulse(1, true, "ipfs://verify-2")).to.emit(
      contract,
      "PulseReviewed"
    );

    const recordAfter = await contract.getPulse(1);
    expect(recordAfter.approveCount).to.equal(2);
    expect(recordAfter.status).to.equal(1);
  });
});


