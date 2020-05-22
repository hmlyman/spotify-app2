import React, { Component } from "react";
import "./App.css";
import { authEndpoint, clientId, redirectUrl, scopes } from "./config";
import hash from "./hash";
import * as $ from "jquery";
import Player from "./player";
import queryString from "query-string";

let defaultStyle = {
  color: "white",
};
let fakeServerData = {
  user: {
    name: "Heather",
    playlists: [
      {
        name: "My Favorites",
        songs: [
          { name: "song 1", duration: 1345 },
          { name: "song 2", duration: 1345 },
        ],
      },
      {
        name: "Country",
        songs: [
          { name: "song 1", duration: 1345 },
          { name: "hej hej monika", duration: 1345 },
        ],
      },
    ],
  },
};

// app.get("/login", function (req, res) {
//   var scopes = "user-read-private user-read-email";
//   res.redirect(
//     "https://accounts.spotify.com/authorize" +
//       "?response_type=code" +
//       "&client_id=" +
//       my_client_id +
//       (scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
//       "&redirect_uri=" +
//       encodeURIComponent(redirect_uri)
//   );
// });

class Auth extends Component {
  constructor() {
    super();
    this.state = {
      token: null,
      item: {
        album: {
          images: [{ url: "" }],
        },
        name: "",
        artists: [{ name: "" }],
        duration_ms: 0,
      },
      is_playing: "Paused",
      progress_ms: 0,
    };
    this.getCurrentlyPlaying = this.getCurrentlyPlaying.bind(this);
  }
  componentDidMount() {
    // Set token
    let _token = hash.access_token;

    if (_token) {
      // Set token
      this.setState({
        token: _token,
      });
      this.getCurrentlyPlaying(_token);
    }
  }

  getCurrentlyPlaying(token) {
    // Make a call using the token
    $.ajax({
      url: "https://api.spotify.com/v1/me/player",
      type: "GET",
      beforeSend: (xhr) => {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      },
      success: (data) => {
        console.log("Player Data", data);
        this.setState({
          item: data.item,
          is_playing: data.is_playing,
          progress_ms: data.progress_ms,
        });
      },
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          {!this.state.token && (
            <a
              className="btn btn--loginApp-link"
              href={`${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUrl}&scope=${scopes.join(
                "%20"
              )}&response_type=token&show_dialog=true`}
            >
              Login to Spotify
            </a>
          )}
          {this.state.token && (
            <Player
              item={this.state.item}
              is_playing={this.state.is_playing}
              progress_ms={this.progress_ms}
            />
          )}
        </header>
      </div>
    );
  }
}

class PlaylistCounter extends Component {
  render() {
    return (
      <div style={{ ...defaultStyle, width: "40%", display: "inline-block" }}>
        <h2>{this.props.playlists.length} playlists</h2>
      </div>
    );
  }
}

class HoursCounter extends Component {
  render() {
    let allSongs = this.props.playlists.reduce((songs, eachPlaylist) => {
      return songs.concat(eachPlaylist.songs);
    }, []);
    let totalDuration = allSongs.reduce((sum, eachSong) => {
      return sum + eachSong.duration;
    }, 0);
    return (
      <div style={{ ...defaultStyle, width: "40%", display: "inline-block" }}>
        <h2>{Math.round(totalDuration / 60)} hours</h2>
      </div>
    );
  }
}

class Filter extends Component {
  render() {
    return (
      <div style={defaultStyle}>
        <input
          type="text"
          onKeyUp={(event) => this.props.onTextChange(event.target.value)}
        />
      </div>
    );
  }
}

class Playlist extends Component {
  render() {
    let playlist = this.props.playlist;
    return (
      <div style={{ ...defaultStyle, display: "inline-block", width: "25%" }}>
        <img
          src={playlist.imageUrl}
          alt="playlistImage"
          style={{ width: "60px" }}
        />
        <h3>{playlist.name}</h3>
        <ul>
          {playlist.songs.map((song) => (
            <li>{song.name}</li>
          ))}
        </ul>
      </div>
    );
  }
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      serverData: {},
      filterString: "",
    };
  }

  componentDidMount() {
    let _token = hash.access_token;
    if (_token) {
      this.setState({
        token: _token,
      });
      this.fetchUser(_token);
      this.fetchPlaylist(_token);
    }
  }

  fetchUser(token) {
    $.ajax({
      url: "https://api.spotify.com/v1/me",
      type: "GET",
      beforeSend: (xhr) => {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      },
      success: (data) => {
        this.setState({ user: { name: data.display_name } });
        console.log("User Data", data);
      },
    });
  }
  fetchPlaylist(token) {
    $.ajax({
      url: "https://api.spotify.com/v1/me/playlists",
      type: "GET",
      beforeSend: (xhr) => {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      },
      success: (data) => {
        this.setState({
          playlists: data.items.map((item) => {
            console.log("Playlist Items", data.items);
            return {
              name: item.name,
              imageUrl: item.images[0].url,
              songs: [],
            };
          }),
        });
      },
    });
  }
  render() {
    let playlistToRender =
      this.state.user && this.state.playlists
        ? this.state.playlists.filter((playlist) =>
            playlist.name
              .toLowerCase()
              .includes(this.state.filterString.toLowerCase())
          )
        : [];
    return (
      <div className="App">
        <Auth />
        {this.state.user ? (
          <div>
            <h1 style={{ ...defaultStyle, "font-size": "54px" }}>
              {this.state.user.name}'s Playlist
            </h1>

            <PlaylistCounter playlists={playlistToRender} />
            <HoursCounter playlists={playlistToRender} />
            <Filter
              onTextChange={(text) => this.setState({ filterString: text })}
            />
            {playlistToRender.map((playlist) => (
              <Playlist playlist={playlist} />
            ))}
          </div>
        ) : (
          <h1 style={{ ...defaultStyle }}>Loading...</h1>
        )}
      </div>
    );
  }
}

export default App;
