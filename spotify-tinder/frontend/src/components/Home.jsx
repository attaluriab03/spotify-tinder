import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import "swiper/css/navigation"; // Import styles for navigation
import "swiper/css/pagination"; // Import styles for pagination
import '../style/Home.css';

// Import the necessary modules from 'swiper' correctly
import { Navigation, Pagination } from "swiper/modules"; 

import NavBar from "./NavBar";

const Home = () => {
  // Sample data for songs
  const [songs, setSongs] = useState([
    {
      id: 1,
      title: "Song 1",
      artist: "Artist 1",
      cover: "https://linktoimage1.jpg",
    },
    {
      id: 2,
      title: "Song 2",
      artist: "Artist 2",
      cover: "https://linktoimage2.jpg",
    },
    {
      id: 3,
      title: "Song 3",
      artist: "Artist 3",
      cover: "https://linktoimage3.jpg",
    },
    // Add more songs here
  ]);

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
          modules={[Navigation, Pagination]} // Add the modules here
          onSlideChange={(swiper) => console.log("Slide changed")}
          onSwiper={(swiper) => console.log(swiper)}
        >
          {songs.map((song) => (
            <SwiperSlide key={song.id}>
              <div className="card">
                <img src={song.cover} alt={song.title} className="song-cover" />
                <div className="card-info">
                  <h2>{song.title}</h2>
                  <p>{song.artist}</p>
                  <div className="buttons">
                    <button onClick={() => handleSwipeRight(song)}>Like</button>
                    <button onClick={() => handleSwipeLeft(song)}>Skip</button>
                  </div>
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
