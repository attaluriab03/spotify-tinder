import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    
    const { accessToken } = useContext(AuthContext);

    const navigate = useNavigate();
  
    useEffect(() => {
      if (accessToken) {
        navigate('/home');
      }
    }, [accessToken, navigate])
  
  
    const handleLogin = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = 'http://localhost:8000/login';
    };

  return (
    <div>
      <header>
        <h1>Spotify Tinder App</h1>
        {!accessToken && (
            <button onClick={handleLogin}>Log in with Spotify</button>
        )} 
      </header>
    </div>
  );
};

export default Login;
