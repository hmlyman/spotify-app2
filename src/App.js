import React, { Component } from "react";
import "./App.css";
import { authEndpoint, clientId, redirectUrl, scopes } from "./config";
import hash from "./hash";
import * as $ from "jquery";
import Player from "./player";

let defaultStyle = {
  color: "white",
  "font-family": "Helvetica",
  padding: "10px",
};

let counterStyle = {
  ...defaultStyle,
  width: "40%",
  display: "inline-block",
  "margin-bottom": "20px",
  "font-size": "20px",
  "line-height": "30px",
};

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
    let _token = hash.access_token;
    if (_token) {
      this.setState({
        token: _token,
      });
      this.getCurrentlyPlaying(_token);
    }
  }

  getCurrentlyPlaying(token) {
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
    let playlistCounterStyle = {
      ...counterStyle,
    };
    return (
      <div style={playlistCounterStyle}>
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
    let totalDurationHours = Math.round(totalDuration / 60);
    let isTooLow = totalDurationHours < 10;
    let hoursCounterStyle = {
      ...counterStyle,
      color: isTooLow ? "red" : "white",
      "font-weight": isTooLow ? "bold" : "normal",
    };
    return (
      <div style={hoursCounterStyle}>
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
          style={{
            ...defaultStyle,
            color: "black",
            "font-size": "20px",
            padding: "10px",
          }}
        />
      </div>
    );
  }
}

class Playlist extends Component {
  render() {
    let playlist = this.props.playlist;
    return (
      <div
        style={{
          ...defaultStyle,
          display: "inline-block",
          width: "25%",
          padding: "10px",
          "background-color": this.props.index % 2 ? "#C0C0C0" : "#808080",
        }}
      >
        <img
          src={playlist.imageURL}
          alt="playlistImage"
          style={{ width: "60px" }}
        />
        <h3>{playlist.name}</h3>
        <ul style={{ "margin-top": "10px" }}>
          {playlist.songs.map((song) => (
            <li style={{ "padding-top": "2px" }}>{song.name}</li>
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

    fetch("https://api.spotify.com/v1/me/playlists", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(response)
      )
      .then((playlistData) => {
        let playlists = playlistData.items;
        let trackDataPromises = playlists.map((playlist) => {
          let responsePromise = fetch(playlist.tracks.href, {
            headers: { Authorization: "Bearer " + token },
          });
          let trackDataPromise = responsePromise.then((response) =>
            response.json()
          );
          return trackDataPromise;
        });
        let allTracksDatasPromises = Promise.all(trackDataPromises);
        let playlistsPromise = allTracksDatasPromises.then((trackDatas) => {
          trackDatas.forEach((trackData, i) => {
            playlists[i].trackDatas = trackData.items
              .map((item) => item.track)
              .map((trackData) => ({
                name: trackData.name,
                duration: trackData.duration_ms / 1000,
              }));
          });
          return playlists;
        });
        return playlistsPromise;
      })
      .then((playlists) => {
        this.setState({
          playlists: playlists.map((item) => {
            console.log("Track Data", item.trackDatas);
            console.log("Playlist Data", item);
            return {
              name: item.name,
              imageURL: item.images[0].url,
              songs: item.trackDatas.slice(0, 3),
            };
          }),
        });
      });
  }

  render() {
    let playlistToRender =
      this.state.user && this.state.playlists
        ? this.state.playlists.filter((playlist) => {
            let matchesPlaylist = playlist.name
              .toLowerCase()
              .includes(this.state.filterString.toLowerCase());
            let matchesSong = playlist.songs.filter((song) =>
              song.name
                .toLowerCase()
                .includes(this.state.filterString.toLowerCase())
            );
            return matchesPlaylist || matchesSong.length > 0;
          })
        : [];
    return (
      <div className="App">
        <Auth />
        {this.state.user ? (
          <div>
            <h1 style={{ ...defaultStyle, fontSize: "54px" }}>
              {this.state.user.name}'s Playlist
            </h1>

            <PlaylistCounter playlists={playlistToRender} />
            <HoursCounter playlists={playlistToRender} />
            <Filter
              onTextChange={(text) => this.setState({ filterString: text })}
            />
            {playlistToRender.map((playlist, i) => (
              <Playlist playlist={playlist} index={i} />
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
