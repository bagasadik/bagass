'use strict'

/** Follow Followers Target **/
/** CODE BY CCOCOT | CCOCOT.CO **/
/** ccocot@bc0de.net **/
/** BC0DE.NET - NAONLAH.NET - WingKocoli **/

const Client = require('instagram-private-api').V1;
const delay = require('delay');
const chalk = require('chalk');
const _ = require('lodash');
const rp = require('request-promise');
const inquirer = require('inquirer');

const User = [
	{
		type:'input',
		name:'username',
		message:'Insert Username'
	},
	{
		type:'password',
		name:'password',
		message:'Insert Password',
		mask:'*'
	},
	{
		type:'input',
		name:'target',
		message:'Insert Username Target (Without @[at])'
	},
	{
		type:'input',
		name:'text',
		message:'Insert Text Comment'
	},
	{
		type:'input',
		name:'sleep',
		message:'Insert Sleep (In MiliSeconds)',
		validate: function(value){
			value = value.match(/[0-9]/);
			if (value) return true;
			return 'Delay is number';
		}
	}
]

const Login = async function(User){

    const Device = new Client.Device(User.username);
    const Storage = new Client.CookieMemoryStorage();
    const session = new Client.Session(Device, Storage);

    try {
        await Client.Session.create(Device, Storage, User.username, User.password)
        const account = await session.getAccount();
        return Promise.resolve({session,account});
    } catch (err) {
        return Promise.reject(err);
    }

}

const Target = async function(username){
	const url = 'https://www.instagram.com/'+username+'/?__a=1'
	const option = {
		url: url,
		method: 'GET',
		json:true
	}
	try{
		const account = await rp(option);
		if (account.user.is_private) {
			return Promise.reject('Target is private Account');
		} else {
			const id = account.user.id;
			const followers = account.user.followed_by.count;
			return Promise.resolve({id,followers});			
		}
	} catch (err){
		return Promise.reject(err);
	}

}

const CommentAndLike = async function(session, accountId, text){

	const feed = new Client.Feed.UserMedia(session, accountId);

	try {
		const result = await feed.get();
		if (result.length > 0) {
			const Follow = Client.Relationship.create(session, accountId);
			const doComment = Client.Comment.create(session, result[0].params.id, text);
			await Promise.all([Follow,doComment]);
			return chalk`{bold.green SUKSES [Follow,Comment]} | ${text}`;
		}
	} catch (err) {
		return chalk`{bold.red GAGAL}`;
	}

};

const Followers = async function(session, id){
	const feed = new Client.Feed.AccountFollowers(session, id);
	try{
		const Pollowers = [];
		var cursor;
		do {
			if (cursor) feed.setCursor(cursor);
			const getPollowers = await feed.get();
			await Promise.all(getPollowers.map(async(akun) => {
				Pollowers.push(akun.id);
			}))
			cursor = await feed.getCursor();
		} while(feed.isMoreAvailable());
		return Promise.resolve(Pollowers);
	} catch(err){
		return Promise.reject(err);
	}
}

const Excute = async function(User, TargetUsername, Text, Sleep){
	try {
		const doLogin = await Login(User);
		const getTarget = await Target(TargetUsername);
		console.log(chalk`{yellow ${TargetUsername}[${getTarget.id}] Followers: ${getTarget.followers}}\n`)
		const getFollowers = await Followers(doLogin.session, doLogin.account.id)
		const Targetfeed = new Client.Feed.AccountFollowers(doLogin.session, getTarget.id);
		var TargetCursor;
		do {
			if (TargetCursor) Targetfeed.setCursor(TargetCursor);
			var TargetResult = await Targetfeed.get();
			TargetResult = _.chunk(TargetResult, 5);
			for (let i = 0; i < TargetResult.length; i++) {
				await Promise.all(TargetResult[i].map(async(akun) => {
					if (!getFollowers.includes(akun.id) && akun.params.isPrivate === false) {
						const ngeDo = await CommentAndLike(doLogin.session, akun.id, Text)
						console.log(chalk`{bold.green [>]}${akun.params.username} => ${ngeDo}`)
					} else {
						console.log(chalk`{bold.yellow [SKIPPED]}${akun.params.username} => UDAH DI FOLLOW MHANK`)
					}
				}));
				console.log(chalk`{yellow Delay For ${Sleep} MiliSeconds}`);
				await delay(Sleep);
			}
			TargetCursor = await Targetfeed.getCursor();
			console.log(chalk`{yellow Delay For ${Sleep} MiliSeconds}`);
			await delay(Sleep);
		} while(Targetfeed.isMoreAvailable());
	} catch (err) {
		console.log(err);
	}
}

console.log(chalk`
{bold Instagram FFT Auto Comment, Auto Like, Auto Follow}
{green BC0DE.NET - NAONLAH.NET - WingKocoli}
{bold.red Code By Ccocot | ccocot@bc0de.net}
`);

inquirer.prompt(User)
	.then(answers => {
		Excute({
			username:answers.username,
			password:answers.password
		},answers.target,answers.text,answers.sleep);
	})
