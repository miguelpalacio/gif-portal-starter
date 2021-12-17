import React, { useCallback, useEffect, useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import idl from './idl.json';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import kp from './keypair.json';

// -------------------------------------
// Constants
// -------------------------------------

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
// let baseAccount = Keypair.generate();	// BUG: this will asks us to create a base account on every refresh

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
	preflightCommitment: 'processed',
};

const TWITTER_HANDLE = 'miguelpalacio';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// const TEST_GIFS = [
// 	'https://media.giphy.com/media/8DTnuPhxv0m4w/giphy.gif',
// 	'https://media.giphy.com/media/YrHFILYNmk2wByofdX/giphy.gif',
// 	'https://media.giphy.com/media/3ohhwuxFOPqA2rjYpG/giphy.gif',
// 	'https://media.giphy.com/media/LTafJjGLZieXu/giphy-downsized-large.gif',
// 	'https://media.giphy.com/media/VXJWhaO7afRe/giphy.gif',
// 	'https://media.giphy.com/media/nbB1CV1fazlGo/giphy.gif',
// 	'https://media.giphy.com/media/3o6Ztbi66nkovK0ACY/giphy.gif',
// ];

// -------------------------------------
// Component
// -------------------------------------

const App = () => {
	const [walletAddress, setWalletAddress] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [gifList, setGifList] = useState([]);

	// ---------------------------------
	// React lifecycle
	// ---------------------------------

	/*
	 * When our component first mounts, let's check to see if we have a connected
	 * Phantom Wallet
	 */
	useEffect(() => {
		const onLoad = async () => {
			await checkIfWalletIsConnected();
		};
		window.addEventListener('load', onLoad);
		return () => window.removeEventListener('load', onLoad);
	}, []);

	/**
	 *
	 */
	useEffect(() => {
		if (walletAddress) {
			console.log('Fetching GIF list...');
			getGifList();
		}
		// eslint-disable-next-line
	}, [walletAddress]);

	// ---------------------------------
	// Methods
	// ---------------------------------

	/*
	 * This function holds the logic for deciding if a Phantom Wallet is
	 * connected or not
	 */
	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window;

			if (solana) {
				if (solana.isPhantom) {
					console.log('Phantom wallet found!');

					/*
					 * The solana object gives us a function that will allow us to connect
					 * directly with the user's wallet!
					 */
					const response = await solana.connect({ onlyIfTrusted: true });
					const wAddress = response.publicKey.toString();
					console.log('Connected with Public Key:', wAddress);

					setWalletAddress(wAddress);
				}
			} else alert('Solana object not found! Get a Phantom Wallet 👻');
		} catch (error) {
			console.error(error);
		}
	};

	/*
	 * Let's define this method so our code doesn't break.
	 * We will write the logic for this next!
	 */
	const connectWallet = async () => {
		const { solana } = window;

		if (solana) {
			const response = await solana.connect();
			const wAddress = response.publicKey.toString();
			console.log('Connected with Public Key:', wAddress);

			setWalletAddress(wAddress);
		}
	};

	/**
	 *
	 */
	const onInputChange = useCallback((event) => {
		const { value } = event.target;
		setInputValue(value);
	}, []);

	/**
	 *
	 */
	const getProvider = () => {
		const connection = new Connection(network, opts.preflightCommitment);
		return new Provider(connection, window.solana, opts.preflightCommitment);
	};

	/**
	 *
	 */
	const createGifAccount = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);

			console.log('ping');

			await program.rpc.startStuffOff({
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId,
				},
				signers: [baseAccount],
			});

			console.log('Created a new BaseAccount w/ address:', baseAccount.publicKey.toString());
			await getGifList();
		} catch (error) {
			console.log('Error creating BaseAccount account:', error);
		}
	};

	/**
	 *
	 */
	const getGifList = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

			console.log('Got the account', account);
			setGifList(account.gifList);
		} catch (error) {
			console.error('Error in getGifList', error);
			setGifList(null);
		}
	};

	/**
	 *
	 */
	const sendGif = useCallback(async () => {
		if (inputValue.length === 0) {
			console.log('No gif link given!');
			return;
		}
		setInputValue('');
		console.log('Gif link:', inputValue);
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);

			await program.rpc.addGif(inputValue, {
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
				},
			});
			console.log('GIF successfully sent to program', inputValue);

			await getGifList();
		} catch (error) {
			console.log('Error sending GIF:', error);
		}
	}, [inputValue, gifList]);

	/*
	 * We want to render this UI when the user hasn't connected
	 * their wallet to our app yet.
	 */
	const renderNotConnectedContainer = useCallback(
		() => (
			<button className='cta-button connect-wallet-button' onClick={connectWallet}>
				Connect to Wallet
			</button>
		),
		[]
	);

	/**
	 *
	 */
	// const renderConnectedContainer = useCallback(
	// 	() => (
	// 		<div className='connected-container'>
	// 			<form
	// 				onSubmit={(event) => {
	// 					event.preventDefault();
	// 					sendGif();
	// 				}}
	// 			>
	// 				<input type='text' placeholder='Enter gif link!' value={inputValue} onChange={onInputChange} />
	// 				<button type='submit' className='cta-button submit-gif-button'>
	// 					Submit
	// 				</button>
	// 			</form>
	// 			<div className='gif-grid'>
	// 				{gifList.map((gif) => (
	// 					<div className='gif-item' key={gif}>
	// 						<img src={gif} alt={gif} />
	// 					</div>
	// 				))}
	// 			</div>
	// 		</div>
	// 	),
	// 	[inputValue, onInputChange, sendGif, gifList]
	// );

	/**
	 *
	 */
	const renderConnectedContainer = useCallback(() => {
		// If we hit this, it means the program account hasn't been initialized.
		if (gifList === null) {
			return (
				<div className='connected-container'>
					<button className='cta-button submit-gif-button' onClick={createGifAccount}>
						Do One-Time Initialization For GIF Program Account
					</button>
				</div>
			);
		}
		// Otherwise, we're good! Account exists. User can submit GIFs.
		else {
			return (
				<div className='connected-container'>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							sendGif();
						}}
					>
						<input type='text' placeholder='Enter gif link!' value={inputValue} onChange={onInputChange} />
						<button type='submit' className='cta-button submit-gif-button'>
							Submit
						</button>
					</form>
					<div className='gif-grid'>
						{/* We use index as the key instead, also, the src is now item.gifLink */}
						{gifList.map((item, index) => (
							<div className='gif-item' key={index}>
								<img src={item.gifLink} />
							</div>
						))}
					</div>
				</div>
			);
		}
	}, [inputValue, onInputChange, sendGif, gifList]);

	// ---------------------------------
	// View
	// ---------------------------------

	return (
		<div className='App'>
			<div className={walletAddress ? 'authed-container' : 'container'}>
				<div className='header-container'>
					<p className='header'>🖼 Action GIFs Portal</p>
					<p className='sub-text'>View your action GIF collection in the metaverse ✨</p>
					{!walletAddress && renderNotConnectedContainer()}
					{walletAddress && renderConnectedContainer()}
				</div>
				<div className='footer-container'>
					<img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
					<a
						className='footer-text'
						href={TWITTER_LINK}
						target='_blank'
						rel='noreferrer'
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
};

export default App;
