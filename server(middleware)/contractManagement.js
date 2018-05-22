const fs = require('fs');
const solc = require('solc');
const childProcess = require('child_process');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

class Contract {
    constructor(pathOfSol, addressOfDepolyer = web.eth.coinbase, gas = '4700000'){
        this.pathOfSol = pathOfSol;
        this.addressOfDeployer = addressOfDepolyer;
        this.gas = gas;
    }

    deploy(){
        let source = fs.readFileSync(this.pathOfSol, 'utf8');// solc file source decided by yourself
        let compiledContract = solc.compile(source, 1);
        let abi = compiledContract.contracts[Object.keys(compiledContract.contracts)[0]].interface;
        let bytecode = compiledContract.contracts[Object.keys(compiledContract.contracts)[0]].bytecode;

        //let gasEstimate = web3.eth.estimateGas({data: bytecode}); 暫時先不用這個
        let MyContract = web3.eth.contract(JSON.parse(abi));

        let myContractReturned = MyContract.new({
                from: this.addressOfDeployer, // account address decided by yourself
                data: bytecode,
                gas: this.gas
            }, function(err, myContract){
                if(err) throw err;

                if(!err) {
                    console.log('abi: !', /*JSON.parse(*/abi/*)*/) // 用JSON.parse 出來的abi，will not call contract in callContractWeb3.js
                    if(!myContract.address) {
                        console.log('txHash: ', myContract.transactionHash)
                    } else {
                        console.log('contractAddress: ', myContract.address)
                    }

                    let contentOfFile = `const Web3 = require('web3');
                    const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
                    let MyContract = web3.eth.contract(${abi});
                    let myContractInstance = MyContract.at('${myContract.address}');

                    let events = myContractInstance.allEvents({fromBlock: 0, toBlock: 'latest'});
                    events.watch(function(error, result){
                       console.log(result);
                    });`;

                    fs.writeFile('result.js', contentOfFile, function (err) {
                        if (err) throw err;
                        runScript('./result.js', function (err) {
                            if (err) throw err;
                            console.log('finished running result.js');
                        });
                    });
                }
            }
        );
    }
}

function runScript(scriptPath, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    let invoked = false;

    let process = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

}

module.exports = Contract;
