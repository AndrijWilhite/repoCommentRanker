const axios = require('axios');
const config = require('./src/config.js');
const chalk = require('chalk');
var _ = require('lodash');
var moment = require('moment');
const leftPad = require('left-pad');
const _cliProgress = require('cli-progress');



var repo;
var period;
const comments = [];
const userStat=[];
const users =[];
const final = [];



//gets param for repo
if(process.argv.indexOf("--repo") != -1){
    repo = process.argv[process.argv.indexOf("--repo") + 1];
};
//gets param for period and removes non digit character
if(process.argv.indexOf("--period") != -1){
    period = process.argv[process.argv.indexOf("--period") + 1].replace(/\D/g,'');
};

//simple check to ensure both params required are passed
if(period == undefined || repo == undefined){
    let msg = "Please ensure that you have passed the 'repo' flag and the 'period' flag, as well as pass valid params for them."
    console.log(msg);
    process.exit(1);
};
console.log("\n");
console.log('Fetching comments for past ' + period + ' days for "' + repo + '"...');

//builds the progress bar and starts it
const progressBar = new _cliProgress.Bar({fps: 60, format: '[{bar}] {percentage}% | rateLimit: {rateLimit}/5000'}, _cliProgress.Presets.shades_classic);

console.log("\n");
progressBar.start(100, 0)

const apiBase = 'https://api.github.com';
const http = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `token ${config.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    },
  });


const setDay = (moment().dayOfYear()) - period;
//converts the date into day of year and compares against the day of year for the comment
function dateCheck(comment){
    let postDate = moment(comment.created_at).dayOfYear();
    if(postDate >= setDay){
        comments.push(comment);
    };
};

//cycles through the various comment end points and hits them, pushes to Comments
async function getComments() {
    var reqEnd = ['/comments', '/issues/comments', '/pulls/comments']
    for(const ending of reqEnd){
        if(ending == '/comments'){
        progressBar.update(20);
        }else if(ending == '/issues/comments'){
            progressBar.update(40);
        }else if(ending == '/issues/comments'){
            progressBar.update(60);
        };

        try {
            const response = await http.get('/repos/' + repo + ending)
            response.data.forEach(comment => {
                dateCheck(comment);
            });
        } catch (err) {
            console.log(err)
        };
    };
};

function statsHandler(resp){
    if(resp.status == 202){
        setTimeout(function(){getStats(), 5000});
    }else if(resp.status == 200){
        resp.data.forEach(stat => {
            userStat.push({'name':stat.author.login , 'commits':stat.total})
        });
    }else{
        console.log('Error: '+resp.status);
    };
};

//hits the stats/commit api
async function getStats() {
    progressBar.update(80);
        try {
            const response = await http.get('/repos/' + repo + '/stats/contributors');
            statsHandler(response);
        } catch (err) {
            console.log(err)
        
        };
};

async function getRateLimit() {
        try {
            const response = await http.get('/rate_limit')
            return response.data.rate;

        } catch (err) {
            console.log(err)
        
        };
};

function checkRate(){
    getRateLimit().then(function(rate){
        if(rate.remaining >= 4){
            progressBar.start(100, 0, {
                rateLimit: rate.remaining
            })
            runPoll();
        }else if(rate.remaining <= 3){
            var waitTime = moment.unix(rate.reset).toString()
            console.log('You have reach the Rate Limit for this key, please wait until'+ waitTime);        
        }
    });
};

function runPoll(){
    getComments().then(function(){
        if(comments == undefined || comments.length <1){
            console.log("\n");
            console.log("There are no comments for this repo.");
            process.exit();
        }else{
            for(const comment of comments){
                users.push(comment.user.login);
            };
            let userComCount = _.countBy(users);
            //hits stats api
            getStats().then(function(){
                //thats commit data and the comments data and and pushes into their own data set
                userStat.forEach(function(person){
                    let keys = Object.keys(userComCount);
                    keys.forEach(function(key){
                        if(person.name == key){
                            final.push({'name': person.name, 'comments':userComCount[key], 'commits': person.commits})
                        };
                    });
                });
    
                //reverse so that highest comment is in position 0
                let sortedFinal = _.sortBy(final, 'comments').reverse();
                //maxLength is used for leftPad 
                var maxLength = "";
                progressBar.update(100);
    
                //prints the people and their comment/commit info from the final array
                sortedFinal.forEach(function(person){
                    if (maxLength == ""){
                        //required to handle spacing issue with progress bar
                        console.log('\n');
                        maxLength += (person.comments+"").length
                        let result = person.comments+" comments, "+person.name+" ("+person.commits+" commits)";
                        console.log(result);
                    }else {
                        let comLength = maxLength - (person.comments+"").length
                        let result = leftPad(person.comments, comLength+1)+" comments, "+person.name+" ("+person.commits+" commits)";
                        console.log(result);
                    };
                });
                progressBar.stop();
            })

        }
    });
}

checkRate();



