// challenge required issue : https://github.com/dilame/instagram-private-api/issues/1637#issuecomment-1194940480

/* tslint:disable:no-console */
import { IgApiClient, IgLoginTwoFactorRequiredError } from 'instagram-private-api';
import Bluebird from 'bluebird';
import inquirer from 'inquirer';

// inspired from // https://github.com/dilame/instagram-private-api/blob/master/examples/account-followers.feed.example.ts
const basicLogin = async (subscribeBackAllFollowers = false) => {
    console.log(`basicLogin ${subscribeBackAllFollowers ? "with subscribeBackAllFollowers":""}`);
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    const auth = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    await ig.challenge.auto(true)
    const followersFeed = ig.feed.accountFollowers(auth.pk);
    const wholeResponse = await followersFeed.request();
    console.log(wholeResponse); // You can reach any properties in instagram response

    const items = await followersFeed.items();
    console.log(items); // Here you can reach items. It's array.

    const thirdPageItems = await followersFeed.items();
    // Feed is stateful and auto-paginated. Every subsequent request returns results from next page
    console.log(thirdPageItems); // Here you can reach items. It's array.

    const feedState = followersFeed.serialize(); // You can serialize feed state to have an ability to continue get next pages.
    console.log(feedState);
    followersFeed.deserialize(feedState);

    const fourthPageItems = await followersFeed.items();
    console.log(fourthPageItems);

    if (subscribeBackAllFollowers) {
    // You can use RxJS stream to subscribe to all results in this feed.
    // All the RxJS powerful is beyond this example - you should learn it by yourself.
    followersFeed.items$.subscribe(
        followers => console.log(followers),
        error => console.error(error),
        () => console.log('Complete!'),
    );
    }
}

// inspired from // https://github.com/dilame/instagram-private-api/blob/master/examples/2fa-sms-login.example.ts
// Return logged in user object
const oauth2 = async ()  => {
    console.log("oauth2Try");
    // Initiate Instagram API client
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    ig.state.proxyUrl = process.env.IG_PROXY;

    // Perform usual login
    // If 2FA is enabled, IgLoginTwoFactorRequiredError will be thrown
    return Bluebird.try(() => ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD)).catch(
        IgLoginTwoFactorRequiredError,
        async err => {
            const {username, totp_two_factor_on, two_factor_identifier} = err.response.body.two_factor_info;
            // decide which method to use
            const verificationMethod = totp_two_factor_on ? '0' : '1'; // default to 1 for SMS
            // At this point a code should have been sent
            // Get the code
            const { code } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'code',
                    message: `Enter code received via ${verificationMethod === '1' ? 'SMS' : 'TOTP'}`,
                },
            ]);
            // Use the code to finish the login process
            return ig.account.twoFactorLogin({
                username,
                verificationCode: code,
                twoFactorIdentifier: two_factor_identifier,
                verificationMethod, // '1' = SMS (default), '0' = TOTP (google auth for example)
                trustThisDevice: '1', // Can be omitted as '1' is used by default
            });
        },
    ).catch(e => console.error('An error occurred while processing two factor auth', e, e.stack));
}


// inspired from // https://github.com/dilame/instagram-private-api/issues/1278
const challengedLogin = async () => {
    console.log("challengedLogin")
    // Initiate Instagram API client
    const ig = new IgApiClient();
    //generating a state
    ig.state.generateDevice('username');
    //set the proxy
    ig.state.proxyUrl = 'Proxy URL';
    Bluebird.try(async () => {
        //try to login
        const auth = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
        console.log(auth);
    }).catch( async () => {
        //if we get an error
        console.log(ig.state.checkpoint); // Checkpoint info here
        await ig.challenge.auto(true); // Requesting sms-code or click "It was me" button
        console.log(ig.state.checkpoint); // Challenge info here
        //pausing the code and asking for an input in the terminal assign the input to the variable code
        const { code } = await inquirer.prompt([
            {
                type: 'input',
                name: 'code',
                message: 'Enter code',
            },
        ]);
        console.log(code);
        //sending the security code o instagram
        console.log(await ig.challenge.sendSecurityCode(code));
        //the code stops in the line above and doesnt run anything below that
        const userToScrape = await ig.user.getIdByUsername(process.env.IG_USERNAME);
        console.log(userToScrape);
    }).catch(e => console.log('Could not resolve checkpoint:', e, e.stack));
};


// inspired from // https://github.com/dilame/instagram-private-api (main readme)
const homepageLogin = async () => {
    console.log(`homepageLogin`);
    const ig = new IgApiClient();
    // You must generate device id's before login.
    // Id's generated based on seed
    // So if you pass the same value as first argument - the same id's are generated every time
    ig.state.generateDevice(process.env.IG_USERNAME);

    // Execute all requests prior to authorization in the real Android application
    // Not required but recommended
    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    // The same as preLoginFlow()
    // Optionally wrap it to process.nextTick so we dont need to wait ending of this bunch of requests
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    // Create UserFeed instance to get loggedInUser's posts
    const userFeed = ig.feed.user(loggedInUser.pk);
    const myPostsFirstPage = await userFeed.items();
    console.log(myPostsFirstPage);
};

/**
 * historical try
 * - try all methods and got "challenge required" as result
 * - "challenge required" issue : I found a lots of issue, the most interesting one is https://github.com/dilame/instagram-private-api/issues/1637#issuecomment-1194940480
 *
 * - so open IG with browser :
 * - > ig ask 2FA + sms code confirmation done / then update password with a fresh one
 * - > then next basicLogin give me : 400 Bad Request; The password you entered is incorrect
 *  (maybe updated password not well/directly replicated.. need to test again next time)
 *
 * - basicLogin: add more logs on request.js l54 : give me challenge.url in login response.body :
 * - > try challenge.url in browser: IG ask me if login attempt was me and request password change,
 * - > then next attempt I got "400 Bad Request; The password you entered is incorrect" with fresh password
 *
 * - homepageLogin with recommended pre/post login flow: got "401 Unauthorized; Please wait a few minutes before you try again."
 * ==> read this IG behavior REX for banned IPs : https://stealthoptional.com/apps/please-wait-a-few-minutes-before-you-try-again-instagram-fix/
 */

const wanted = process.argv[2] ? process.argv[2] : "help";
const help = () => console.log("please choose : basic, oauth2, challenge, home");
switch (wanted) {
    case "basic": await basicLogin(); break;
    case "oauth2": await oauth2(); break;
    case "challenge": await challengedLogin(); break;
    case "home": await homepageLogin(); break;
    case "help": default: help();
}