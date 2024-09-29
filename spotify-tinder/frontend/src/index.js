import React from 'react';
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Home from './components/Home';
import Profile from './components/Profile';
import { AuthProvider } from './components/AuthContext';

const RootApp = () => {
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<AuthProvider location={location} navigate={navigate}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path='/home' element={<Home />}/>
          <Route path="/profile" element={<Profile />} />
        </Routes>
    </AuthProvider>
	);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  	// <React.StrictMode>
      <BrowserRouter> 
        <RootApp />
      </BrowserRouter>
  	// </React.StrictMode>,
)

