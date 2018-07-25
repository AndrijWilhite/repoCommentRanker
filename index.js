const axios = require('axios');
const config = require('./src/config.js');
const chalk = require('chalk');
var _ = require('lodash');
var moment = require('moment');
const leftPad = require('left-pad')


var repo;
var period;

//gets param for repo
if(process.argv.indexOf("--repo") != -1){
    repo = process.argv[process.argv.indexOf("--repo") + 1];
}
//gets param for period and removes non digit character
if(process.argv.indexOf("--period") != -1){
    period = process.argv[process.argv.indexOf("--period") + 1].replace(/\D/g,'');
}

//simple check to ensure both params required are passed
if(period == undefined || repo == undefined){
    let msg = "Please ensure that you have passed the 'repo' flag and the 'period' flag, as well as pass valid params for them."
    console.log(msg);
    process.exit(1);
}

console.log('Fetching comments for past ' + period + ' days for "' + repo + '"...');

const apiBase = 'https://api.github.com';
const http = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `token ${config.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    },
  });

var comments = [];


const setDay = (moment().dayOfYear()) - period;
function dateCheck(comment){
    let postDate = moment(comment.created_at).dayOfYear();
    if(postDate >= setDay){
        comments.push(comment);
    }
}


//cycles through the various comment end points and hits them, pushes to Comments
async function getComments() {
    var reqEnd = ['/comments', '/issues/comments', '/pulls/comments']
    for(const ending of reqEnd){
        try {

            const response = await http.get('/repos/' + repo + ending)
            response.data.forEach(comment => {
                dateCheck(comment);
            });
        } catch (err) {
            console.error(chalk.red(err))
            console.dir(err.response.data, { colors: true, depth: 4 })
        }
    };
}

var userStat=[]

async function getStats() {
        try {
            const response = await http.get('/repos/' + repo + '/stats/contributors')
            response.data.forEach(stat => {
                userStat.push({'name':stat.author.login , 'commits':stat.total})
            });
        } catch (err) {
            console.error(chalk.red(err))
            console.dir(err.response.data, { colors: true, depth: 4 })
        }
    
}

const users =[];

const final = []

function run(){
    getComments().then(function(){
        for(const comment of comments){
            users.push(comment.user.login);
        };
        let userComCount = _.countBy(users);

        getStats().then(function(){

            userStat.forEach(function(person){
                let keys = Object.keys(userComCount);
                keys.forEach(function(key){
                    if(person.name == key){
                        final.push({'name': person.name, 'comments':userComCount[key], 'commits': person.commits})
                    }
                })

            })
            let sortedFinal = _.sortBy(final, 'comments').reverse();
            var maxLength = "";

            sortedFinal.forEach(function(person){
                if (maxLength == 0){
                    maxLength += (person.comments+"").length
                    let result = person.comments+" comments, "+person.name+" ("+person.commits+" commits)";
                    console.log(result);

                }else {
                    let comLength = maxLength - (person.comments+"").length
                    let result = leftPad(person.comments, comLength+1)+" comments, "+person.name+" ("+person.commits+" commits)";
                    console.log(result);
                }


            });
        })
    });
}

run();



