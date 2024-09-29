// src/components/NavBar.js
import React from 'react';
import '../style/NavBar.css';

const NavBar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="explore-btn">Explore New</button>
      </div>

      <div className="navbar-center">
        <h1 className="navbar-title">Home</h1>
      </div>

      <div className="navbar-right">
        <div className="profile-circle">
          <img 
            src="https://via.placeholder.com/40" 
            alt="profile" 
            className="profile-img"
          />
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
