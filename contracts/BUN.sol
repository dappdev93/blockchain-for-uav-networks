pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

contract BUN {
    // User roles in the system
    enum ROLE {
        Null,
        Admin,
        Sensor,
        Drone
    }

    // data storage for user profile
    mapping(address => User) public user;
    mapping(uint256 => Request) public request;

    address[] public userIds;
    uint256[] public requestIds;
    uint256 lastrequestId;

    struct User {
        address wallet;
        bytes publicKey;
        ROLE role;
    }

    struct Request {
        address sensor;
        address drone;
        bytes encryptedData;
    }

    // A modifier used to restrict functions access to only admin
    modifier onlyAdmin() {
        require(
            user[msg.sender].role == ROLE.Admin,
            "BUN: Only Admin can call this function"
        );
        _;
    }

    // A modifier used to restrict functions access to only Sensor
    modifier onlySensor() {
        require(
            user[msg.sender].role == ROLE.Sensor,
            "BUN: Only Sensor can call this function"
        );
        _;
    }

    // A modifier used to restrict functions access to only Drone
    modifier onlyDrone() {
        require(
            user[msg.sender].role == ROLE.Drone,
            "BUN: Only Drone can call this function"
        );
        _;
    }

    // Event log for registerNewUser function
    event registerNewUserLog(address wallet, bytes publicKey, ROLE role);

    // Event log for requestData function
    event requestDataLog(uint256 id, address drone, address sensor);

    // Event log for provideData function
    event provideDataLog(
        uint256 id,
        address drone,
        address sensor,
        bytes encryptedData
    );

    constructor() public {
        user[msg.sender].role = ROLE.Admin;
        user[msg.sender].wallet = msg.sender;
        userIds.push(msg.sender);
    }

    // Register new user function. This function is only called by Admin
    function registerNewUser(
        address _wallet,
        bytes calldata _publicKey,
        ROLE _role
    ) external onlyAdmin {
        require(user[_wallet].role == ROLE.Null, "BUN: User registered before");

        require(
            _role == ROLE.Drone || _role == ROLE.Sensor || _role == ROLE.Admin,
            "BUN: User role is not supported"
        );
        user[_wallet].wallet = _wallet;
        user[_wallet].publicKey = _publicKey;
        user[_wallet].role = _role;
        userIds.push(_wallet);

        emit registerNewUserLog(_wallet, _publicKey, _role);
    }

    // This function is used by Drone to request data from Sensor.
    function requestData(address _sensor) external onlyDrone {
        require(
            user[_sensor].role == ROLE.Sensor,
            "BUN: Sensor is not registered before"
        );

        lastrequestId++;
        request[lastrequestId].drone = msg.sender;
        request[lastrequestId].sensor = _sensor;
        requestIds.push(lastrequestId);

        emit requestDataLog(lastrequestId, msg.sender, _sensor);
    }

    // This function is used by Sensor to provide data requesed by Drone.
    function provideData(uint256 _id, bytes calldata _encryptedData)
        external
        onlySensor
    {
        require(
            request[_id].sensor == msg.sender,
            "BUN: Sensor should be the same"
        );
        require(
            request[_id].encryptedData.length == 0,
            "BUN: encryptedData has been provided before"
        );
        request[_id].encryptedData = _encryptedData;

        emit provideDataLog(
            _id,
            request[_id].drone,
            msg.sender,
            _encryptedData
        );
    }

    // This function returns specific user public key
    function getUserPublicKey(address _wallet)
        public
        view
        returns (bytes memory)
    {
        return user[_wallet].publicKey;
    }

    // This function returns all system userIds information
    function getusers()
        public
        view
        returns (
            address[] memory,
            bytes[] memory,
            ROLE[] memory
        )
    {
        address[] memory _wallet = new address[](userIds.length);
        bytes[] memory _publicKey = new bytes[](userIds.length);
        ROLE[] memory _role = new ROLE[](userIds.length);

        for (uint256 i = 0; i < userIds.length; i++) {
            _wallet[i] = user[userIds[i]].wallet;
            _publicKey[i] = user[userIds[i]].publicKey;
            _role[i] = user[userIds[i]].role;
        }

        return (_wallet, _publicKey, _role);
    }

    // This function returns all Requests information
    function getRequests()
        public
        view
        returns (
            uint256[] memory,
            address[] memory,
            address[] memory,
            bytes[] memory
        )
    {
        uint256[] memory _id = new uint256[](requestIds.length);
        address[] memory _sensor = new address[](requestIds.length);
        address[] memory _drone = new address[](requestIds.length);
        bytes[] memory _encryptedData = new bytes[](requestIds.length);

        for (uint256 i = 0; i < requestIds.length; i++) {
            _id[i] = requestIds[i];
            _sensor[i] = request[requestIds[i]].sensor;
            _drone[i] = request[requestIds[i]].drone;
            _encryptedData[i] = request[requestIds[i]].encryptedData;
        }

        return (_id, _sensor, _drone, _encryptedData);
    }
}
