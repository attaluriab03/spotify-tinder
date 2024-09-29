import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import SwiperCore, { Navigation, Pagination } from "swiper/modules";
import NavBar from "./NavBar";

import "swiper/css/navigation"; // Import styles for navigation
import "swiper/css/pagination"; // Import styles for pagination

const Home = () => {
  // Sample data
  const [songs, setSongs] = useState([]);

  const handleSwipeRight = (song) => {
    console.log(`Swiped right on: ${song.title}`);
    // Add logic for "liking" the song (e.g., save to playlist)
  };

  const handleSwipeLeft = (song) => {
    console.log(`Swiped left on: ${song.title}`);
    // Add logic for "skipping" the song
  };

  return (
    <> 
        <NavBar />
        <div className="home-page">
        <h1>Swipe Your Favorite Songs</h1>
        <Swiper
            spaceBetween={30}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            onSlideChange={(swiper) => console.log("Slide changed")}
            onSwiper={(swiper) => console.log(swiper)}
        >
            {songs.map((song) => (
            <SwiperSlide key={song.id}>
                <div className="card">
                <img src={song.cover} alt={song.title} />
                <div className="card-info">
                    <h2>{song.title}</h2>
                    <p>{song.artist}</p>
                    <button onClick={() => handleSwipeRight(song)}>Like</button>
                    <button onClick={() => handleSwipeLeft(song)}>Skip</button>
                </div>
                </div>
            </SwiperSlide>
            ))}
        </Swiper>
        </div>
    </>
    
  );
};

export default Home;
