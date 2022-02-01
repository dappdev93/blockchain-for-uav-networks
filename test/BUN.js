const { expectRevert, expectEvent } = require("@openzeppelin/test-helpers");
const BUN = artifacts.require("BUN");

contract("BUN", (accounts) => {
  const { fromAscii, toBN, toUtf8 } = web3.utils;

  const ROLE = {
    Null: 0,
    Admin: 1,
    Sensor: 2,
    Drone: 3,
  };

  let bun;
  const publicKey = fromAscii("publicKeyValue");
  const encryptedData = fromAscii("encryptedDataValue");

  const [admin, sensor_1, sensor_2, drone_1, drone_2, unregistredUser] =
    accounts;

  beforeEach(async () => {
    bun = await BUN.new({ from: admin });
  });

  describe("Smart Contract Deployment", async () => {
    it("should set admin", async () => {
      const userInfo = await bun.user(admin);
      assert(userInfo.wallet === admin);
      assert(parseInt(userInfo.role) === ROLE.Admin);
    });
  });

  describe("New user registration", async () => {
    it("should register a new Sensor", async () => {
      const txHash = await bun.registerNewUser(
        sensor_1,
        publicKey,
        ROLE.Sensor,
        { from: admin }
      );
      const userInfo = await bun.user(sensor_1);
      assert(userInfo.wallet === sensor_1);
      assert(userInfo.publicKey === publicKey);
      assert(parseInt(userInfo.role) === ROLE.Sensor);
      expectEvent(txHash, "registerNewUserLog", {
        wallet: sensor_1,
        publicKey: publicKey,
        role: toBN(ROLE.Sensor),
      });
    });

    it("should register a new Drone", async () => {
      const txHash = await bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
        from: admin,
      });
      const userInfo = await bun.user(drone_1);
      assert(userInfo.wallet === drone_1);
      assert(userInfo.publicKey === publicKey);
      assert(parseInt(userInfo.role) === ROLE.Drone);
      expectEvent(txHash, "registerNewUserLog", {
        wallet: drone_1,
        publicKey: publicKey,
        role: toBN(ROLE.Drone),
      });
    });

    it("should NOT register existing user", async () => {
      await bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
        from: admin,
      });

      await expectRevert(
        bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
          from: admin,
        }),
        "BUN: User registered before"
      );
    });

    it("only admin can add new  user", async () => {
      await expectRevert(
        bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
          from: unregistredUser,
        }),
        "BUN: Only Admin can call this function"
      );
    });
  });

  describe("Request Data", async () => {
    beforeEach(async () => {
      await bun.registerNewUser(sensor_1, publicKey, ROLE.Sensor, {
        from: admin,
      });
      await bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
        from: admin,
      });
    });

    it("should send data request", async () => {
      const txHash = await bun.requestData(sensor_1, {
        from: drone_1,
      });

      const requestInfo = await bun.request(1);

      assert(requestInfo.sensor === sensor_1);
      assert(requestInfo.drone === drone_1);
      assert(requestInfo.encryptedData === null);

      expectEvent(txHash, "requestDataLog", {
        id: toBN(1),
        drone: drone_1,
        sensor: sensor_1,
      });
    });

    it("should NOT send data request if Sensor is not registered before", async () => {
      await expectRevert(
        bun.requestData(sensor_2, {
          from: drone_1,
        }),
        "BUN: Sensor is not registered before"
      );
    });

    it("should NOT send data request if caller is not Drone", async () => {
      await expectRevert(
        bun.requestData(sensor_1, {
          from: drone_2,
        }),
        "BUN: Only Drone can call this function"
      );
    });
  });

  describe("Provide Data", async () => {
    beforeEach(async () => {
      await bun.registerNewUser(sensor_1, publicKey, ROLE.Sensor, {
        from: admin,
      });
      await bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
        from: admin,
      });

      await bun.requestData(sensor_1, {
        from: drone_1,
      });
    });

    it("should provide data", async () => {
      const txHash = await bun.provideData(1, encryptedData, {
        from: sensor_1,
      });

      const requestInfo = await bun.request(1);

      assert(requestInfo.sensor === sensor_1);
      assert(requestInfo.drone === drone_1);
      assert(requestInfo.encryptedData === encryptedData);

      expectEvent(txHash, "provideDataLog", {
        id: toBN(1),
        drone: drone_1,
        sensor: sensor_1,
        encryptedData: encryptedData,
      });
    });

    it("should NOT provide data if data provided before", async () => {
      await bun.provideData(1, encryptedData, {
        from: sensor_1,
      });

      await expectRevert(
        bun.provideData(1, encryptedData, {
          from: sensor_1,
        }),
        "BUN: encryptedData has been provided before"
      );
    });

    it("should NOT provide data if caller is not the same Sensor", async () => {
      await bun.registerNewUser(sensor_2, publicKey, ROLE.Sensor, {
        from: admin,
      });

      await expectRevert(
        bun.provideData(1, encryptedData, {
          from: sensor_2,
        }),
        "BUN: Sensor should be the same"
      );
    });

    it("should NOT provide data if caller is not Sensor", async () => {
      await expectRevert(
        bun.provideData(1, encryptedData, {
          from: unregistredUser,
        }),
        "BUN: Only Sensor can call this function"
      );
    });
  });

  describe("Reading data", async () => {
    beforeEach(async () => {
      await bun.registerNewUser(sensor_1, publicKey, ROLE.Sensor, {
        from: admin,
      });

      await bun.registerNewUser(sensor_2, publicKey, ROLE.Sensor, {
        from: admin,
      });

      await bun.registerNewUser(drone_1, publicKey, ROLE.Drone, {
        from: admin,
      });

      await bun.registerNewUser(drone_2, publicKey, ROLE.Drone, {
        from: admin,
      });

      await bun.requestData(sensor_1, {
        from: drone_1,
      });

      await bun.requestData(sensor_2, {
        from: drone_2,
      });

      await bun.provideData(1, encryptedData, {
        from: sensor_1,
      });

      await bun.provideData(2, encryptedData, {
        from: sensor_2,
      });
    });

    it("get users information", async () => {
      const usersInfo = await bun.getusers();

      assert(usersInfo[0][0] == admin);
      assert(usersInfo[0][1] == sensor_1);
      assert(usersInfo[0][2] == sensor_2);
      assert(usersInfo[0][3] == drone_1);
      assert(usersInfo[0][4] == drone_2);
      assert(usersInfo[1][1] == publicKey);
      assert(usersInfo[1][2] == publicKey);
      assert(usersInfo[1][3] == publicKey);
      assert(usersInfo[1][4] == publicKey);
      assert(parseInt(usersInfo[2][0]) == ROLE.Admin);
      assert(parseInt(usersInfo[2][1]) == ROLE.Sensor);
      assert(parseInt(usersInfo[2][2]) == ROLE.Sensor);
      assert(parseInt(usersInfo[2][3]) == ROLE.Drone);
      assert(parseInt(usersInfo[2][4]) == ROLE.Drone);
    });

    it("get requests information", async () => {
      const requestsInfo = await bun.getRequests();

      assert(parseInt(requestsInfo[0][0]) == 1);
      assert(parseInt(requestsInfo[0][1]) == 2);
      assert(requestsInfo[1][0] == sensor_1);
      assert(requestsInfo[1][1] == sensor_2);
      assert(requestsInfo[2][0] == drone_1);
      assert(requestsInfo[2][1] == drone_2);
      assert(requestsInfo[3][0] == encryptedData);
      assert(requestsInfo[3][1] == encryptedData);
    });

    it("get user Public Key value", async () => {
      const sensor_1_PublicKey = await bun.getUserPublicKey(sensor_1);
      const sensor_2_PublicKey = await bun.getUserPublicKey(sensor_2);
      const drone_1_PublicKey = await bun.getUserPublicKey(sensor_1);
      const drone_2_PublicKey = await bun.getUserPublicKey(drone_2);

      assert(sensor_1_PublicKey == publicKey);
      assert(sensor_2_PublicKey == publicKey);
      assert(drone_1_PublicKey == publicKey);
      assert(drone_2_PublicKey == publicKey);
    });
  });
});
