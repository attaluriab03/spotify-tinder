import axios from "axios";
import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

const AuthProvider = ({ children, location, navigate }) => {
	const [accessToken, setAccessToken] = useState(null);
	const [refreshToken, setRefreshToken] = useState(null);
	const [userID, setUserID] = useState(null);
	const [userName, setUserName] = useState(null);
	const [docID, setDocID] = useState(null);

	useEffect(() => {
		const hash = location.hash;
		// for when user first logs in, since tokens are present in URL after hash
		if (hash) {
		  const params = new URLSearchParams(hash.slice(1));
		  const _accessToken = params.get('access_token');
		  const _refreshToken = params.get('refresh_token');
		  const _userID = params.get('user_id');
		  const _userName = params.get('user_name');
		  if (_accessToken && _refreshToken) {
			setAccessToken(_accessToken);
			setRefreshToken(_refreshToken);
			setUserID(_userID);
			setUserName(_userName);
			window.location.hash = ''; // removing hash from the URL
			localStorage.setItem('access_token', _accessToken);
			localStorage.setItem('refresh_token', _refreshToken);
			localStorage.setItem('user_id', _userID);
			localStorage.setItem('user_name', _userName);
		  }
		}
		/* when user goes to different pages of website and location URL changes, 
		this makes sure the tokens are still retrieved and set to keep user logged in */
		else {
		  const storedAccessToken = localStorage.getItem('access_token');
		  const storedRefreshToken = localStorage.getItem('refresh_token');
		  const storedUserID = localStorage.getItem('user_id');
		  const storedUserName = localStorage.getItem('user_name');
		  if (storedAccessToken && storedRefreshToken) {
			setAccessToken(storedAccessToken);
			setRefreshToken(storedRefreshToken);
			setUserID(storedUserID);
			setUserName(storedUserName);
		  }
		  
		}
	}, [location]);

	const handleLogout = () => {
		setAccessToken(null);
		setRefreshToken(null);
		localStorage.removeItem('access_token');
		localStorage.removeItem('refresh_token');
		navigate("/"); // navigate back to landing page
	}

	const getDocId = async () => {
		if (userID) {
			const response = await axios.put(`http://localhost:8000/users/query/${userID}`, {
				userId: userID
			}).then((t) => {
				setDocID(t.data);
				localStorage.setItem("docID",t.data);
			})
		}
	}
	
	useEffect(() => {
		getDocId();
	}, [userID]);

	  // userID represents spotify username, not doc ID from database
	  // docID represents database doc id
	  return (
		<AuthContext.Provider value={{ accessToken, refreshToken, userID, userName, handleLogout, docID }}> 
			{children}
		</AuthContext.Provider>
	  )
};

export { AuthContext, AuthProvider };