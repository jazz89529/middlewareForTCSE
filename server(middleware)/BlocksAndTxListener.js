const web3 = require('../librarySettings/web3Settings');
const client = require('../librarySettings/mqttSettings');
const connectToMySQL = require('../librarySettings/dbSettings');

const filter = web3.eth.filter('latest');

class BlocksAndTxListener {
    implement(){
        filter.watch(callback);
        function callback (err, hashOfBlock){
            if(!err && web3.eth.getBlock(hashOfBlock).number != 0) {
                let resultOfBlock = web3.eth.getBlock(hashOfBlock);// 拿到整個block

                client.publish('blockchainBlock', JSON.stringify(resultOfBlock)); // publish MQTT

                //處理block 部分
                connectToMySQL.query("SELECT number FROM blocks ORDER BY number DESC LIMIT 1", function (err, result, fields) {
                    if (err) throw err;
                    else {
                        if(result[0]==undefined || resultOfBlock.number > result[0].number ) { //因為一開啟filter會自動載入最後一個block，這裏判斷要比資料庫的上一筆更大才可以插入
                            let blocksInsert = `INSERT INTO blocks (number, hash, parentHash, nonce, sha3Uncles, transactionRoot, stateRoot, miner, difficulty, totalDifficulty, extraData, size, gasLimit, gasUsed, timestamp, transactions) VALUES (${resultOfBlock.number}, '${resultOfBlock.hash}', '${resultOfBlock.parentHash}', '${resultOfBlock.nonce}', '${resultOfBlock.sha3Uncles}', '${resultOfBlock.transactionRoot}', '${resultOfBlock.stateRoot}', '${resultOfBlock.miner}', ${resultOfBlock.difficulty}, ${resultOfBlock.totalDifficulty}, '${resultOfBlock.extraData}', ${resultOfBlock.size}, ${resultOfBlock.gasLimit}, ${resultOfBlock.gasUsed}, ${resultOfBlock.timestamp}, '${resultOfBlock.transactions[0]}')`;
                            connectToMySQL.query(blocksInsert, function (err, result) {
                                if (err) throw err;
                                console.log("blocks record inserted");
                            });
                        }
                    }
                });

                //處理tx 部分
                let transactionHashOfBlock = [];
                let transactionOfBlock;
                for(let i = 0; i < resultOfBlock.transactions.length; i++){
                    transactionHashOfBlock[i] = resultOfBlock.transactions[i];
                    transactionOfBlock = web3.eth.getTransaction(transactionHashOfBlock[i]);
                    console.log(transactionOfBlock);

                    client.publish('blockchainTransaction', JSON.stringify(transactionOfBlock)); // publish MQTT

                    connectToMySQL.query("SELECT blockNumber FROM transactions ORDER BY blockNumber DESC LIMIT 1", function (err, result, fields) {
                        if (err) throw err;
                        else {
                            if(result[0]==undefined || transactionOfBlock.blockNumber > result[0].blockNumber) { //因為一開啟filter會自動載入最後一個block，這裏判斷要比資料庫的上一筆更大才可以插入
                                let txInsert = `INSERT INTO transactions (hash, nonce, blockhash, blockNumber, transactionIndex, fromAdd, toAdd, value, gas, gasPrice, input) VALUES ('${transactionOfBlock.hash}', ${transactionOfBlock.nonce}, '${transactionOfBlock.blockHash}', ${transactionOfBlock.blockNumber}, ${transactionOfBlock.transactionIndex}, '${transactionOfBlock.from}', '${transactionOfBlock.to}', ${transactionOfBlock.value.c[0]}, ${transactionOfBlock.gas}, ${transactionOfBlock.gasPrice.c[0]}, '${transactionOfBlock.input}')`;
                                connectToMySQL.query(txInsert, function (err, result) {
                                    if (err) throw err;
                                    console.log("tx record inserted");
                                });
                            }
                        }
                    });
                }
            }
        }
    }
}

module.exports = BlocksAndTxListener;


