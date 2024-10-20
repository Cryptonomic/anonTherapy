// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract anonTherapy {
    // Mapping from address to string
    mapping(address => string) private addressToString;

    // Function to write a string value for an address
    function write(address _address, string memory _value) public {
        addressToString[_address] = _value;
    }

    // Function to read the string value for an address
    function read(address _address) public view returns (string memory) {
        return addressToString[_address];
    }
}
