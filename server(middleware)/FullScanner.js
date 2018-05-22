const web3 = require('../librarySettings/web3Settings');
const client = require('../librarySettings/mqttSettings');
const connectToMySQL = require('../librarySettings/dbSettings');

class FullScanner {
    implement() {
        web3.eth.getBlockNumber(function (error, committedBlockNumber){
            if (error) throw error;

            else {
                for(let i = 1; i <= committedBlockNumber; i++) {
                    web3.eth.getBlock(i, function (error, resultOfBlock) {
                        if (error) throw error;

                        else{

                            let transactionHashOfBlock = [];
                            let transactionOfBlock;
                            for(let i = 0; i < resultOfBlock.transactions.length; i++){
                                if(resultOfBlock.transactions.length != 0){
                                    transactionHashOfBlock[i] = resultOfBlock.transactions[i];
                                    transactionOfBlock = web3.eth.getTransaction(transactionHashOfBlock[i]);
                                    //console.log(transactionOfBlock);

                                    client.publish('blockchainTransaction', JSON.stringify(transactionOfBlock)); // publish MQTT

                                    let txInsert = `INSERT INTO transactions (hash, nonce, blockhash, blockNumber, transactionIndex, fromAdd, toAdd, value, gas, gasPrice, input) VALUES ('${transactionOfBlock.hash}', ${transactionOfBlock.nonce}, '${transactionOfBlock.blockHash}', ${transactionOfBlock.blockNumber}, ${transactionOfBlock.transactionIndex}, '${transactionOfBlock.from}', '${transactionOfBlock.to}', ${transactionOfBlock.value.c[0]}, ${transactionOfBlock.gas}, ${transactionOfBlock.gasPrice.c[0]}, '${transactionOfBlock.input}')`;
                                    connectToMySQL.query(txInsert, function (err, result) {
                                        if (err) throw err;
                                        console.log("tx record inserted");
                                    });
                                }

                            }

                            client.publish('blockchainBlock', JSON.stringify(resultOfBlock));
                            //console.log(resultOfBlock);

                            let blocksInsert = `INSERT INTO blocks (number, hash, parentHash, nonce, sha3Uncles, transactionRoot, stateRoot, miner, difficulty, totalDifficulty, extraData, size, gasLimit, gasUsed, timestamp, transactions) VALUES (${resultOfBlock.number}, '${resultOfBlock.hash}', '${resultOfBlock.parentHash}', '${resultOfBlock.nonce}', '${resultOfBlock.sha3Uncles}', '${resultOfBlock.transactionRoot}', '${resultOfBlock.stateRoot}', '${resultOfBlock.miner}', ${resultOfBlock.difficulty}, ${resultOfBlock.totalDifficulty}, '${resultOfBlock.extraData}', ${resultOfBlock.size}, ${resultOfBlock.gasLimit}, ${resultOfBlock.gasUsed}, ${resultOfBlock.timestamp}, '${resultOfBlock.transactions[0]}')`;
                            connectToMySQL.query(blocksInsert, function (err, result) {
                                if (err) throw err;
                                console.log("blocks record inserted");
                            });

                        }
                        //console.log(resultOfBlock/*.difficulty.toNumber()*/);
                    });
                }
            }
        })
    }
}

module.exports = FullScanner;



// mysql -u root -p
// show databases;
// switch blockchaindata;
// 清空資料表
// truncate table table_name;

