const web3 = require('../librarySettings/web3Settings');
const client = require('../librarySettings/mqttSettings');
const connectToMySQL = require('../librarySettings/dbSettings');

let blockNumber = web3.eth.blockNumber;

class LostDataCollector {
    implement(){
        connectToMySQL.query("SELECT number FROM blocks", function (err, result, fields) {
            if (err) throw err;
            else {
                let comparison = [];
                let dbIndex = [];
                for(let i = 0; i < blockNumber; i++) { //初始化一個比較陣列：從1開始到最近的blockNumber
                    comparison[i] = i + 1;
                }

                for(let j = 0; j < result.length; j++) { //把db的number放到一個陣列裡
                    dbIndex[j] = result[j].number;
                }
                dbIndex.reverse();

                for(let k = 0; k < blockNumber; k++) { // 如果db的number有的話就把比較陣列的值設為0
                    for (let l = 0; l < blockNumber; l++)
                        if(dbIndex[k] == comparison[l])
                            comparison[l] = 0;
                }

                for(let n = 0; n < blockNumber; n++) { // 所以現在比較陣列中只要不等於0的就是 遺失的blockNumber
                    if(comparison[n] != 0){
                        let resultOfBlock = web3.eth.getBlock(comparison[n]);

                        //處理block的部分
                        client.publish('blockchainBlock', JSON.stringify(resultOfBlock)); // publish MQTT

                        connectToMySQL.query("SELECT number FROM blocks ORDER BY number DESC LIMIT 1", function (err, result, fields) {
                            if (err) throw err;
                            else {
                                let blocksInsert = `INSERT INTO blocks (number, hash, parentHash, nonce, sha3Uncles, transactionRoot, stateRoot, miner, difficulty, totalDifficulty, extraData, size, gasLimit, gasUsed, timestamp, transactions) VALUES (${resultOfBlock.number}, '${resultOfBlock.hash}', '${resultOfBlock.parentHash}', '${resultOfBlock.nonce}', '${resultOfBlock.sha3Uncles}', '${resultOfBlock.transactionRoot}', '${resultOfBlock.stateRoot}', '${resultOfBlock.miner}', ${resultOfBlock.difficulty}, ${resultOfBlock.totalDifficulty}, '${resultOfBlock.extraData}', ${resultOfBlock.size}, ${resultOfBlock.gasLimit}, ${resultOfBlock.gasUsed}, ${resultOfBlock.timestamp}, '${resultOfBlock.transactions[0]}')`;
                                connectToMySQL.query(blocksInsert, function (err, result) {
                                    if (err) throw err;
                                    console.log("lose blocks record inserted");
                                });
                            }
                        });

                        //處理tx的部分
                        let transactionHashOfBlock = [];
                        let transactionOfBlock;
                        for(let i = 0; i < resultOfBlock.transactions.length; i++){
                            transactionHashOfBlock[i] = resultOfBlock.transactions[i];
                            transactionOfBlock = web3.eth.getTransaction(transactionHashOfBlock[i]);

                            client.publish('blockchainTransaction', JSON.stringify(transactionOfBlock)); // publish MQTT

                            connectToMySQL.query("SELECT blockNumber FROM transactions ORDER BY blockNumber DESC LIMIT 1", function (err, result, fields) {
                                if (err) throw err;
                                else {
                                    let txInsert = `INSERT INTO transactions (hash, nonce, blockhash, blockNumber, transactionIndex, fromAdd, toAdd, value, gas, gasPrice, input) VALUES ('${transactionOfBlock.hash}', ${transactionOfBlock.nonce}, '${transactionOfBlock.blockHash}', ${transactionOfBlock.blockNumber}, ${transactionOfBlock.transactionIndex}, '${transactionOfBlock.from}', '${transactionOfBlock.to}', ${transactionOfBlock.value.c[0]}, ${transactionOfBlock.gas}, ${transactionOfBlock.gasPrice.c[0]}, '${transactionOfBlock.input}')`;
                                    connectToMySQL.query(txInsert, function (err, result) {
                                        if (err) throw err;
                                        console.log("lose tx record inserted");
                                    });
                                }
                            });
                        }

                    }
                }
            }
        });
    }
}

module.exports = LostDataCollector;













//connectToMySQL.end(); 會有問題
