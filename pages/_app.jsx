'use client' 
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { client, challenge, authenticate, exploreProfiles, defaultProfile } from '../api'
import Link from 'next/link'

export default function Home() {
  /* local state variables to hold user's address and access token */
  const [address, setAddress] = useState()
  const [token, setToken] = useState()
  useEffect(() => {
    /* when the app loads, check to see if the user has already connected their wallet */
    checkConnection()
  }, [])
  async function checkConnection() {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const accounts = await provider.listAccounts()
    if (accounts.length) {
      setAddress(accounts[0])
    }
  }
  async function connect() {
    /* this allows the user to connect their wallet */
    const account = await window.ethereum.send('eth_requestAccounts')
    if (account.result.length) {
      setAddress(account.result[0])
    }
  }

  const [profileInfo, setProfileInfo] = useState()

  async function profileInfoFct() {
    try {
      const profileInfo = await client.query({
        query: defaultProfile,
      })
      setProfileInfo(profileInfo);
      console.log(profileInfo);
      return profileInfo;
    }
    catch(err) {
      console.log('Error signin in:', err);
    }
  }

  async function login() {
    try {
      /* first request the challenge from the API server */
      const challengeInfo = await client.query({
        query: challenge,
        variables: { address }
      })
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner()
      /* ask the user to sign a message with the challenge info returned from the server */
      const signature = await signer.signMessage(challengeInfo.data.challenge.text)
      /* authenticate the user */
      const authData = await client.mutate({
        mutation: authenticate,
        variables: {
          address, signature
        }
      })
      /* if user authentication is successful, you will receive an accessToken and refreshToken */
      const { data: { authenticate: { accessToken }}} = authData
      console.log({ accessToken })
      setToken(accessToken)
    } catch (err) {
      console.log('Error signing in: ', err)
    }
  }

  const [profiles, setProfiles] = useState([])
  useEffect(() => {
    fetchProfiles()
  }, [])

  async function fetchProfiles() {
    try {
      /* fetch profiles from Lens API */
      let response = await client.query({ query: exploreProfiles })
      /* loop over profiles, create properly formatted ipfs image links */
      let profileData = await Promise.all(response.data.exploreProfiles.items.map(async profileInfo => {
        let profile = { ...profileInfo }
        let picture = profile.picture
        if (picture && picture.original && picture.original.url) {
          if (picture.original.url.startsWith('ipfs://')) {
            let result = picture.original.url.substring(7, picture.original.url.length)
            profile.avatarUrl = `http://lens.infura-ipfs.io/ipfs/${result}`
          } else {
            profile.avatarUrl = picture.original.url
          }
        }
        return profile
      }))

      /* update the local state with the profiles array */
      setProfiles(profileData)
    } catch (err) {
      console.log({ err })
    }
  }

  return (
    <div>
      { /* if the user has not yet connected their wallet, show a connect button */ }
      {
        !address && <button onClick={connect}>Connect</button>
      }
      { /* if the user has connected their wallet but has not yet authenticated, show them a login button */ }
      {
        address && !token && (
          <div onClick={login}>
            <button>Login</button>
          </div>
        )
      }
      { /* once the user has authenticated, show them a success message */ }
      {
        address && token && (
          <><h2>Successfully signed in!</h2><button onClick={profileInfoFct}>check</button></>
        )
        /*
        address && token && (
          
          <>
          <h2>Successfully signed in!</h2>
          <div className='flex flex-col justify-center items-center'>
            <h1 className='text-5xl mb-6 font-bold'>Hello Lens 🌿</h1>
            {profiles.map(profile => (
              <div key={profile.id} className='w-2/3 shadow-md p-6 rounded-lg mb-8 flex flex-col items-center'>
                <img className='w-48' src={profile.avatarUrl || 'https://picsum.photos/200'} />
                <p className='text-xl text-center mt-6'>{profile.name}</p>
                <p className='text-base text-gray-400  text-center mt-2'>{profile.bio}</p>
                <Link href={`/profile/${profile.handle}`}>
                  <p className='cursor-pointer text-violet-600 text-lg font-medium text-center mt-2 mb-2'>{profile.handle}</p>
                </Link>
                <p className='text-pink-600 text-sm font-medium text-center'>{profile.stats.totalFollowers} followers</p>
              </div>
            ))}
          </div></>

        )
        */
      }
    </div>
  )
}