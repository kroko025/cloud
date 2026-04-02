// ========== ГЛОБАЛЬНІ ЗМІННІ ==========
let songsList = [];
let favorites = JSON.parse(localStorage.getItem('kroko_favs')) || [];
let customPlaylists = JSON.parse(localStorage.getItem('kroko_playlists')) || [];
let listenCounts = JSON.parse(localStorage.getItem('kroko_listens')) || {};

// Початковий список музики (якщо немає в localStorage)
const defaultSongs = [
    { id: 1, title: "прыгай,дура!", artist: "CUPSIZE", src: "music.mp3", cover: "https://images.genius.com/f75ad29ed7f6bf44dd554844d23954ad.1000x1000x1.png" },
    { id: 2, title: "я схожу с ума", artist: "CUPSIZE", src: "music2.mp3", cover: "https://i1.sndcdn.com/artworks-1FqzgRqmibvGLWB6-46ZxdQ-t500x500.jpg" },
    { id: 3, title: "юра,юра", artist: "CUPSIZE", src: "music3.mp3", cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHGgqDx2FSOQQ5ismVnwpqscRT4VQ4Tv-sdQ&s" },
    { id: 4, title: "Phonk Night", artist: "Kroko", src: "music.mp3", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400" }
];

// Завантажуємо songsList з localStorage, якщо є, інакше defaultSongs
if (localStorage.getItem('kroko_songs')) {
    songsList = JSON.parse(localStorage.getItem('kroko_songs'));
} else {
    songsList = defaultSongs;
    localStorage.setItem('kroko_songs', JSON.stringify(songsList));
}

let currentTrackIndex = 0;
let isPlaying = false;
let currentThemeColor = localStorage.getItem('user_theme') || "#7c3aed";
let currentEditingPlaylist = null;
let currentViewingPlaylist = null;
let activePlaylist = null;
let shuffleMode = false;
let shuffledIndices = [];
let currentShuffleIndex = 0;
let currentPlaybackRate = parseFloat(localStorage.getItem('kroko_playback_rate')) || 1;

const audio = document.getElementById("audio");

// ========== ОСНОВНІ ФУНКЦІЇ ==========
function initApp() {
    const userName = localStorage.getItem('user_name') || "User";
    const displayName = document.getElementById("displayUserName");
    const userAvatar = document.getElementById("userAvatar");
    const nameInput = document.getElementById("nameInput");
    
    if (displayName) displayName.innerText = userName;
    if (userAvatar) userAvatar.innerText = userName[0].toUpperCase();
    if (nameInput) nameInput.value = userName;
    
    applyTheme(currentThemeColor);
    renderSongs(songsList, "songGrid");
    renderPlaylists();
    if (songsList.length) loadTrack(0);
    setupNavigation();
    setupSearch();
    setupThemePicker();
    setupEventListeners();
    setupModals();
    setupDragAndDrop();
    setupHotkeys();
    renderStats();
    
    // Відновлюємо збережену швидкість відтворення
    const rateSelect = document.getElementById("playbackRate");
    if (rateSelect) {
        rateSelect.value = currentPlaybackRate.toString();
        audio.playbackRate = currentPlaybackRate;
    }
    
    const mainLikeBtn = document.getElementById("mainLikeBtn");
    if (mainLikeBtn) mainLikeBtn.onclick = toggleFavorite;
}

function applyTheme(color) {
    currentThemeColor = color;
    document.documentElement.style.setProperty('--p-color', color);
    const bgBlob = document.getElementById("bgBlob");
    if (bgBlob) bgBlob.style.background = color;
    document.querySelectorAll('.theme-circle').forEach(circle => {
        circle.classList.toggle('active', circle.getAttribute('data-color') === color);
    });
}

function setupThemePicker() {
    document.querySelectorAll('.theme-circle').forEach(circle => {
        circle.addEventListener('click', () => applyTheme(circle.getAttribute('data-color')));
    });
}

function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = songsList.filter(song => 
                song.title.toLowerCase().includes(query) || 
                song.artist.toLowerCase().includes(query)
            );
            renderSongs(filtered, "songGrid");
        });
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-target')));
    });
}

function switchTab(target) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.remove('active'));
    
    const activeNav = document.querySelector(`[data-target="${target}"]`);
    const activeSection = document.getElementById(`${target}Section`);
    
    if (activeNav) activeNav.classList.add('active');
    if (activeSection) activeSection.classList.add('active');
    
    if (target === 'library') renderFavorites();
    if (target === 'playlists') renderPlaylists();
    if (target === 'stats') renderStats();
}

function loadTrack(index, fromPlaylist = false) {
    let song;
    if (activePlaylist && fromPlaylist) {
        if (shuffleMode) {
            if (index < 0 || index >= shuffledIndices.length) return;
            song = activePlaylist.songs[shuffledIndices[index]];
            currentShuffleIndex = index;
        } else {
            if (index < 0 || index >= activePlaylist.songs.length) return;
            song = activePlaylist.songs[index];
        }
        currentTrackIndex = index;
        const playlistIndicator = document.getElementById("playlistIndicator");
        if (playlistIndicator) playlistIndicator.innerText = `🎵 ${activePlaylist.name}`;
    } else {
        song = songsList[index];
        currentTrackIndex = index;
        activePlaylist = null;
        shuffleMode = false;
        const playlistIndicator = document.getElementById("playlistIndicator");
        if (playlistIndicator) playlistIndicator.innerText = "";
        const shuffleBtn = document.getElementById("shuffleBtn");
        if (shuffleBtn) shuffleBtn.classList.remove("shuffle-active");
    }
    
    if (!song) return;
    
    const heroTitle = document.getElementById("heroTitle");
    const heroArtist = document.getElementById("heroArtist");
    const miniTitle = document.getElementById("miniTitle");
    const miniArtist = document.getElementById("miniArtist");
    const heroArtBox = document.getElementById("heroArtBox");
    const miniArtBox = document.getElementById("miniArtBox");
    
    if (heroTitle) heroTitle.innerText = song.title;
    if (heroArtist) heroArtist.innerText = song.artist;
    if (miniTitle) miniTitle.innerText = song.title;
    if (miniArtist) miniArtist.innerText = song.artist;
    
    const imgHtml = `<img src="${song.cover}" alt="${song.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2394a3b8\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z\'/%3E%3C/svg%3E'">`;
    if (heroArtBox) heroArtBox.innerHTML = imgHtml;
    if (miniArtBox) miniArtBox.innerHTML = imgHtml;
    
    audio.src = song.src;
    updateLikeUI();
    
    audio.onloadstart = () => {
        const loader = document.getElementById("loadingIndicator");
        if (loader) loader.style.display = "inline";
    };
    audio.oncanplay = () => {
        const loader = document.getElementById("loadingIndicator");
        if (loader) loader.style.display = "none";
        audio.playbackRate = currentPlaybackRate;
    };
}

function renderSongs(songs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (songs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No songs found</div>';
        return;
    }
    
    container.innerHTML = songs.map(song => {
        const songIndex = songsList.findIndex(s => s.id === song.id);
        const removeBtn = containerId === 'libraryGrid' ? 
            `<button class="remove-fav" onclick="event.stopPropagation(); removeFromFavorites(${song.id})">✕</button>` : '';
        
        return `
            <div class="music-card" onclick="playTrack(${songIndex})">
                ${removeBtn}
                <img src="${song.cover}" alt="${song.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2394a3b8\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z\'/%3E%3C/svg%3E'">
                <div class="truncate">${escapeHtml(song.title)}</div>
                <div class="artist-sub">${escapeHtml(song.artist)}</div>
            </div>
        `;
    }).join('');
}

function renderPlaylists() {
    const container = document.getElementById("playlistsContainer");
    if (!container) return;
    
    if (customPlaylists.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No playlists yet. Create your first playlist!</div>';
        return;
    }
    
    container.innerHTML = customPlaylists.map(playlist => {
        const coverHtml = playlist.cover ? `<img class="playlist-cover" src="${playlist.cover}" alt="cover" onerror="this.style.display='none'">` : '<div class="playlist-cover" style="background: var(--p-color); display: flex; align-items: center; justify-content: center;">📀</div>';
        return `
            <div class="playlist-card" onclick="viewPlaylist(${playlist.id})">
                <div class="playlist-header">
                    ${coverHtml}
                    <div class="playlist-actions" onclick="event.stopPropagation()">
                        <button class="edit-playlist-btn" onclick="editPlaylist(${playlist.id})">✏️ Edit</button>
                        <button class="delete-playlist-btn-small" onclick="deletePlaylist(${playlist.id})">🗑️ Delete</button>
                    </div>
                </div>
                <div class="playlist-name">${escapeHtml(playlist.name)}</div>
                <div class="playlist-stats">${playlist.songs.length} songs</div>
            </div>
        `;
    }).join('');
}

function renderFavorites() {
    renderSongs(favorites, "libraryGrid");
}

function renderStats() {
    const container = document.getElementById("statsContainer");
    if (!container) return;
    
    const sorted = Object.entries(listenCounts).sort((a,b) => b[1] - a[1]);
    if (sorted.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No listening data yet. Start playing some music!</div>';
        return;
    }
    
    container.innerHTML = sorted.map(([songId, count]) => {
        const song = songsList.find(s => s.id == songId);
        if (!song) return '';
        return `
            <div class="stat-item">
                <img class="stat-cover" src="${song.cover}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2394a3b8\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z\'/%3E%3C/svg%3E'">
                <div class="stat-info">
                    <div class="truncate">${escapeHtml(song.title)}</div>
                    <div class="artist-sub">${escapeHtml(song.artist)}</div>
                </div>
                <div class="stat-count">${count} plays</div>
            </div>
        `;
    }).join('');
}

// ========== ФУНКЦІЇ ДЛЯ РОБОТИ З ПЛЕЙЛИСТАМИ ==========

function viewPlaylist(playlistId) {
    const playlist = customPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    currentViewingPlaylist = playlist;
    
    const viewTitle = document.getElementById("viewPlaylistTitle");
    if (viewTitle) viewTitle.innerHTML = `📀 ${escapeHtml(playlist.name)}`;
    
    const coverDiv = document.getElementById("viewPlaylistCover");
    if (coverDiv) {
        if (playlist.cover) {
            coverDiv.innerHTML = `<img src="${playlist.cover}" alt="cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2394a3b8\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z\'/%3E%3C/svg%3E'">`;
        } else {
            coverDiv.innerHTML = '<div style="width:100%;height:100%;background:var(--p-color);display:flex;align-items:center;justify-content:center;font-size:40px;">📀</div>';
        }
    }
    
    const songsContainer = document.getElementById("viewPlaylistSongs");
    if (playlist.songs.length === 0) {
        songsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">No songs in this playlist</div>';
    } else {
        songsContainer.innerHTML = playlist.songs.map(song => `
            <div class="playlist-song-item">
                <div>
                    <strong>${escapeHtml(song.title)}</strong><br>
                    <small>${escapeHtml(song.artist)}</small>
                </div>
                <button class="add-song-btn" onclick="playSingleSongFromPlaylist(${song.id})">▶ Play</button>
            </div>
        `).join('');
    }
    
    const playPlaylistBtn = document.getElementById("playPlaylistBtn");
    const shufflePlaylistBtn = document.getElementById("shufflePlaylistBtn");
    
    if (playPlaylistBtn) playPlaylistBtn.onclick = () => playPlaylist(playlist.id, false);
    if (shufflePlaylistBtn) shufflePlaylistBtn.onclick = () => playPlaylist(playlist.id, true);
    
    const modal = document.getElementById("playlistViewModal");
    if (modal) modal.classList.add("show");
}

function playSingleSongFromPlaylist(songId) {
    const song = currentViewingPlaylist.songs.find(s => s.id === songId);
    if (song) {
        const idx = currentViewingPlaylist.songs.findIndex(s => s.id === songId);
        activePlaylist = currentViewingPlaylist;
        shuffleMode = false;
        currentTrackIndex = idx;
        loadTrack(idx, true);
        playTrack(idx, true);
        closeViewPlaylistModal();
    }
}

function playPlaylist(playlistId, shuffle) {
    const playlist = customPlaylists.find(p => p.id === playlistId);
    if (!playlist || playlist.songs.length === 0) {
        alert("This playlist is empty!");
        return;
    }
    
    activePlaylist = playlist;
    shuffleMode = shuffle;
    
    if (shuffleMode) {
        shuffledIndices = Array.from({length: playlist.songs.length}, (_, i) => i);
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }
        currentShuffleIndex = 0;
        loadTrack(0, true);
        playTrack(0, true);
    } else {
        currentTrackIndex = 0;
        loadTrack(0, true);
        playTrack(0, true);
    }
    
    closeViewPlaylistModal();
}

function nextInPlaylist() {
    if (!activePlaylist) return false;
    
    if (shuffleMode) {
        if (currentShuffleIndex + 1 < shuffledIndices.length) {
            currentShuffleIndex++;
            loadTrack(currentShuffleIndex, true);
            playTrack(currentShuffleIndex, true);
            return true;
        } else {
            activePlaylist = null;
            shuffleMode = false;
            const playlistIndicator = document.getElementById("playlistIndicator");
            if (playlistIndicator) playlistIndicator.innerText = "";
            return false;
        }
    } else {
        if (currentTrackIndex + 1 < activePlaylist.songs.length) {
            loadTrack(currentTrackIndex + 1, true);
            playTrack(currentTrackIndex + 1, true);
            return true;
        } else {
            activePlaylist = null;
            const playlistIndicator = document.getElementById("playlistIndicator");
            if (playlistIndicator) playlistIndicator.innerText = "";
            return false;
        }
    }
}

function prevInPlaylist() {
    if (!activePlaylist) return false;
    
    if (shuffleMode) {
        if (currentShuffleIndex - 1 >= 0) {
            currentShuffleIndex--;
            loadTrack(currentShuffleIndex, true);
            playTrack(currentShuffleIndex, true);
            return true;
        }
        return false;
    } else {
        if (currentTrackIndex - 1 >= 0) {
            loadTrack(currentTrackIndex - 1, true);
            playTrack(currentTrackIndex - 1, true);
            return true;
        }
        return false;
    }
}

function createPlaylist() {
    const playlistNameInput = document.getElementById("playlistNameInput");
    if (!playlistNameInput) return;
    
    const playlistName = playlistNameInput.value.trim();
    if (!playlistName) {
        alert("Please enter a playlist name");
        return;
    }
    
    let coverData = null;
    const fileInput = document.getElementById("playlistCoverInput");
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            coverData = e.target.result;
            finalizeCreate(coverData);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        finalizeCreate(null);
    }
    
    function finalizeCreate(cover) {
        const newPlaylist = {
            id: Date.now(),
            name: playlistName,
            songs: [],
            cover: cover
        };
        customPlaylists.push(newPlaylist);
        savePlaylists();
        renderPlaylists();
        closeCreatePlaylistModal();
        playlistNameInput.value = "";
        if (fileInput) fileInput.value = "";
    }
}

function editPlaylist(playlistId) {
    currentEditingPlaylist = customPlaylists.find(p => p.id === playlistId);
    if (!currentEditingPlaylist) return;
    
    const editTitle = document.getElementById("editPlaylistTitle");
    const editNameInput = document.getElementById("editPlaylistNameInput");
    
    if (editTitle) editTitle.innerText = `Edit: ${currentEditingPlaylist.name}`;
    if (editNameInput) editNameInput.value = currentEditingPlaylist.name;
    
    const preview = document.getElementById("editCoverPreview");
    if (preview) {
        if (currentEditingPlaylist.cover) {
            preview.innerHTML = `<img src="${currentEditingPlaylist.cover}" alt="cover">`;
        } else {
            preview.innerHTML = '';
        }
    }
    
    renderPlaylistSongs();
    renderAvailableSongs();
    
    const modal = document.getElementById("editPlaylistModal");
    if (modal) modal.classList.add("show");
}

function renderPlaylistSongs() {
    const container = document.getElementById("playlistSongsList");
    if (!container || !currentEditingPlaylist) return;
    
    if (currentEditingPlaylist.songs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">No songs in this playlist</div>';
        return;
    }
    
    container.innerHTML = currentEditingPlaylist.songs.map(song => `
        <div class="playlist-song-item">
            <div>
                <strong>${escapeHtml(song.title)}</strong><br>
                <small>${escapeHtml(song.artist)}</small>
            </div>
            <button class="remove-song-btn" onclick="removeSongFromPlaylist(${song.id})">Remove</button>
        </div>
    `).join('');
}

function renderAvailableSongs() {
    const container = document.getElementById("availableSongsList");
    if (!container || !currentEditingPlaylist) return;
    
    const playlistSongIds = currentEditingPlaylist.songs.map(s => s.id);
    const availableSongs = songsList.filter(song => !playlistSongIds.includes(song.id));
    
    if (availableSongs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">All songs are already in this playlist</div>';
        return;
    }
    
    container.innerHTML = availableSongs.map(song => `
        <div class="available-song-item">
            <div>
                <strong>${escapeHtml(song.title)}</strong><br>
                <small>${escapeHtml(song.artist)}</small>
            </div>
            <button class="add-song-btn" onclick="addSongToPlaylist(${song.id})">Add</button>
        </div>
    `).join('');
}

function addSongToPlaylist(songId) {
    const song = songsList.find(s => s.id === songId);
    if (song && currentEditingPlaylist) {
        currentEditingPlaylist.songs.push(song);
        savePlaylists();
        renderPlaylistSongs();
        renderAvailableSongs();
    }
}

function removeSongFromPlaylist(songId) {
    if (currentEditingPlaylist) {
        currentEditingPlaylist.songs = currentEditingPlaylist.songs.filter(s => s.id !== songId);
        savePlaylists();
        renderPlaylistSongs();
        renderAvailableSongs();
        if (activePlaylist && activePlaylist.id === currentEditingPlaylist.id) {
            if (activePlaylist.songs[currentTrackIndex]?.id === songId) {
                audio.pause();
                isPlaying = false;
                const playBtn = document.getElementById("play");
                if (playBtn) playBtn.innerText = "▶";
                activePlaylist = null;
                const playlistIndicator = document.getElementById("playlistIndicator");
                if (playlistIndicator) playlistIndicator.innerText = "";
            }
        }
    }
}

function savePlaylistChanges() {
    const editNameInput = document.getElementById("editPlaylistNameInput");
    if (editNameInput && currentEditingPlaylist) {
        const newName = editNameInput.value.trim();
        if (newName) currentEditingPlaylist.name = newName;
    }
    
    const fileInput = document.getElementById("editPlaylistCoverInput");
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentEditingPlaylist.cover = e.target.result;
            savePlaylists();
            renderPlaylists();
            closeEditPlaylistModal();
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        savePlaylists();
        renderPlaylists();
        closeEditPlaylistModal();
    }
}

function removePlaylistCover() {
    if (currentEditingPlaylist) {
        currentEditingPlaylist.cover = null;
        const preview = document.getElementById("editCoverPreview");
        if (preview) preview.innerHTML = '';
        savePlaylists();
        renderPlaylists();
    }
}

function deletePlaylist(playlistId) {
    if (confirm("Are you sure you want to delete this playlist?")) {
        customPlaylists = customPlaylists.filter(p => p.id !== playlistId);
        savePlaylists();
        renderPlaylists();
        if (activePlaylist && activePlaylist.id === playlistId) {
            activePlaylist = null;
            const playlistIndicator = document.getElementById("playlistIndicator");
            if (playlistIndicator) playlistIndicator.innerText = "";
        }
        if (currentEditingPlaylist && currentEditingPlaylist.id === playlistId) {
            closeEditPlaylistModal();
        }
        if (currentViewingPlaylist && currentViewingPlaylist.id === playlistId) {
            closeViewPlaylistModal();
        }
    }
}

function savePlaylists() {
    localStorage.setItem('kroko_playlists', JSON.stringify(customPlaylists));
}

// ========== ФУНКЦІЇ ДЛЯ РОБОТИ З ОБРАНИМИ ==========

function toggleFavorite() {
    let currentSong;
    if (activePlaylist && activePlaylist.songs[currentTrackIndex]) {
        currentSong = activePlaylist.songs[currentTrackIndex];
    } else {
        currentSong = songsList[currentTrackIndex];
    }
    
    const index = favorites.findIndex(fav => fav.id === currentSong.id);
    if (index === -1) {
        favorites.push(currentSong);
    } else {
        favorites.splice(index, 1);
    }
    saveFavorites();
    updateLikeUI();
}

function removeFromFavorites(songId) {
    favorites = favorites.filter(fav => fav.id !== songId);
    saveFavorites();
    renderFavorites();
    updateLikeUI();
}

function saveFavorites() {
    localStorage.setItem('kroko_favs', JSON.stringify(favorites));
}

function updateLikeUI() {
    let currentSong;
    if (activePlaylist && activePlaylist.songs[currentTrackIndex]) {
        currentSong = activePlaylist.songs[currentTrackIndex];
    } else {
        currentSong = songsList[currentTrackIndex];
    }
    const isFav = favorites.some(fav => fav.id === currentSong.id);
    const btn = document.getElementById("mainLikeBtn");
    if (btn) {
        btn.innerText = isFav ? "♥" : "♡";
        btn.classList.toggle("active", isFav);
    }
}

// ========== ПЛЕЄР ==========

function playTrack(index, fromPlaylist = false) {
    if (index !== undefined) {
        if (fromPlaylist && activePlaylist) {
            // loadTrack вже викликано раніше
        } else if (!fromPlaylist) {
            activePlaylist = null;
            shuffleMode = false;
            const playlistIndicator = document.getElementById("playlistIndicator");
            if (playlistIndicator) playlistIndicator.innerText = "";
            const shuffleBtn = document.getElementById("shuffleBtn");
            if (shuffleBtn) shuffleBtn.classList.remove("shuffle-active");
            loadTrack(index);
        }
    }
    audio.play();
    isPlaying = true;
    const playBtn = document.getElementById("play");
    if (playBtn) playBtn.innerText = "⏸";
    
    // Збільшуємо лічильник прослуховувань
    let currentSong;
    if (activePlaylist && activePlaylist.songs[currentTrackIndex]) {
        currentSong = activePlaylist.songs[currentTrackIndex];
    } else {
        currentSong = songsList[currentTrackIndex];
    }
    if (currentSong) {
        listenCounts[currentSong.id] = (listenCounts[currentSong.id] || 0) + 1;
        localStorage.setItem('kroko_listens', JSON.stringify(listenCounts));
        renderStats();
    }
}

function setupEventListeners() {
    const playBtn = document.getElementById("play");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const heroPlayBtn = document.getElementById("heroPlayBtn");
    const progressSlider = document.getElementById("progress");
    const volumeSlider = document.getElementById("volume");
    const shuffleBtn = document.getElementById("shuffleBtn");
    const playbackRateSelect = document.getElementById("playbackRate");
    
    if (playBtn) {
        playBtn.onclick = () => {
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
                playBtn.innerText = "▶";
            } else {
                audio.play();
                isPlaying = true;
                playBtn.innerText = "⏸";
            }
        };
    }
    
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => {
            if (activePlaylist) {
                playTrack(currentTrackIndex, true);
            } else {
                playTrack(currentTrackIndex);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (activePlaylist) {
                if (!nextInPlaylist()) {
                    activePlaylist = null;
                    const playlistIndicator = document.getElementById("playlistIndicator");
                    if (playlistIndicator) playlistIndicator.innerText = "";
                    let nextIndex = (currentTrackIndex + 1) % songsList.length;
                    playTrack(nextIndex);
                }
            } else {
                let nextIndex = (currentTrackIndex + 1) % songsList.length;
                playTrack(nextIndex);
            }
        };
    }
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (activePlaylist) {
                if (!prevInPlaylist()) {
                    activePlaylist = null;
                    const playlistIndicator = document.getElementById("playlistIndicator");
                    if (playlistIndicator) playlistIndicator.innerText = "";
                    let prevIndex = (currentTrackIndex - 1 + songsList.length) % songsList.length;
                    playTrack(prevIndex);
                }
            } else {
                let prevIndex = (currentTrackIndex - 1 + songsList.length) % songsList.length;
                playTrack(prevIndex);
            }
        };
    }
    
    if (shuffleBtn) {
        shuffleBtn.onclick = () => {
            if (activePlaylist) {
                shuffleMode = !shuffleMode;
                if (shuffleMode) {
                    shuffledIndices = Array.from({length: activePlaylist.songs.length}, (_, i) => i);
                    for (let i = shuffledIndices.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
                    }
                    const currentSongId = activePlaylist.songs[currentTrackIndex].id;
                    currentShuffleIndex = shuffledIndices.findIndex(idx => activePlaylist.songs[idx].id === currentSongId);
                    if (currentShuffleIndex === -1) currentShuffleIndex = 0;
                    shuffleBtn.classList.add("shuffle-active");
                } else {
                    shuffleBtn.classList.remove("shuffle-active");
                }
                alert(shuffleMode ? "Shuffle ON" : "Shuffle OFF");
            } else {
                alert("No active playlist to shuffle");
            }
        };
    }
    
    if (audio) {
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                const fill = document.getElementById("progressFill");
                if (fill) fill.style.width = percent + "%";
                const currentTimeSpan = document.getElementById("currentTime");
                if (currentTimeSpan) currentTimeSpan.innerText = formatTime(audio.currentTime);
                const durationSpan = document.getElementById("duration");
                if (durationSpan) durationSpan.innerText = formatTime(audio.duration);
            }
        };
    }
    
    if (progressSlider) {
        progressSlider.oninput = (e) => {
            if (audio.duration) {
                const time = (e.target.value / 100) * audio.duration;
                audio.currentTime = time;
            }
        };
    }
    
    if (volumeSlider) {
        volumeSlider.oninput = (e) => {
            audio.volume = e.target.value;
            const fill = document.getElementById("volumeFill");
            if (fill) fill.style.width = (e.target.value * 100) + "%";
        };
    }
    
    if (playbackRateSelect) {
        playbackRateSelect.onchange = (e) => {
            currentPlaybackRate = parseFloat(e.target.value);
            audio.playbackRate = currentPlaybackRate;
            localStorage.setItem('kroko_playback_rate', currentPlaybackRate);
        };
    }
    
    if (audio) {
        audio.onended = () => {
            if (activePlaylist) {
                if (!nextInPlaylist()) {
                    activePlaylist = null;
                    const playlistIndicator = document.getElementById("playlistIndicator");
                    if (playlistIndicator) playlistIndicator.innerText = "";
                    let nextIndex = (currentTrackIndex + 1) % songsList.length;
                    playTrack(nextIndex);
                }
            } else {
                let nextIndex = (currentTrackIndex + 1) % songsList.length;
                playTrack(nextIndex);
            }
        };
    }
}

// ========== МОДАЛЬНІ ВІКНА ТА ІНШЕ ==========

function setupModals() {
    const createBtn = document.getElementById("createPlaylistBtn");
    if (createBtn) {
        createBtn.onclick = () => {
            const modal = document.getElementById("createPlaylistModal");
            if (modal) modal.classList.add("show");
        };
    }
    
    const confirmCreate = document.getElementById("confirmCreatePlaylistBtn");
    if (confirmCreate) confirmCreate.onclick = createPlaylist;
    
    const closePlaylistModal = document.getElementById("closePlaylistModalBtn");
    if (closePlaylistModal) closePlaylistModal.onclick = closeCreatePlaylistModal;
    
    const saveChanges = document.getElementById("savePlaylistChangesBtn");
    if (saveChanges) saveChanges.onclick = savePlaylistChanges;
    
    const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");
    if (deletePlaylistBtn) {
        deletePlaylistBtn.onclick = () => {
            if (currentEditingPlaylist) {
                deletePlaylist(currentEditingPlaylist.id);
            }
        };
    }
    
    const closeEdit = document.getElementById("closeEditModalBtn");
    if (closeEdit) closeEdit.onclick = closeEditPlaylistModal;
    
    const removeCover = document.getElementById("removeCoverBtn");
    if (removeCover) removeCover.onclick = removePlaylistCover;
    
    const closeView = document.getElementById("closeViewModalBtn");
    if (closeView) closeView.onclick = closeViewPlaylistModal;
    
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            const modal = document.getElementById("settingsModal");
            if (modal) modal.classList.add("show");
        };
    }
    
    const saveSettings = document.getElementById("saveSettingsBtn");
    if (saveSettings) {
        saveSettings.onclick = () => {
            const nameInput = document.getElementById("nameInput");
            const newName = nameInput ? nameInput.value.trim() : "";
            if (newName) {
                localStorage.setItem('user_name', newName);
            }
            localStorage.setItem('user_theme', currentThemeColor);
            location.reload();
        };
    }
    
    const closeSettings = document.getElementById("closeSettingsBtn");
    if (closeSettings) {
        closeSettings.onclick = () => {
            const modal = document.getElementById("settingsModal");
            if (modal) modal.classList.remove("show");
        };
    }
    
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn) {
        profileBtn.onclick = (e) => {
            e.stopPropagation();
            const menu = document.getElementById("accountMenu");
            if (menu) menu.classList.toggle("show");
        };
    }
    
    document.addEventListener("click", () => {
        const menu = document.getElementById("accountMenu");
        if (menu) menu.classList.remove("show");
    });
    
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.onclick = () => {
            localStorage.clear();
            location.reload();
        };
    }
    
    const logoHome = document.getElementById("logoHome");
    if (logoHome) logoHome.onclick = () => switchTab("discover");
    
    const exportBtn = document.getElementById("exportPlaylistsBtn");
    if (exportBtn) exportBtn.onclick = exportPlaylists;
    
    const importBtn = document.getElementById("importPlaylistsBtn");
    if (importBtn) {
        importBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const imported = JSON.parse(ev.target.result);
                            if (Array.isArray(imported)) {
                                customPlaylists = imported;
                                savePlaylists();
                                renderPlaylists();
                                alert('Playlists imported successfully!');
                            } else {
                                alert('Invalid file format');
                            }
                        } catch (err) {
                            alert('Error parsing file');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        };
    }
}

function exportPlaylists() {
    const dataStr = JSON.stringify(customPlaylists, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kroko_playlists_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function closeCreatePlaylistModal() {
    const modal = document.getElementById("createPlaylistModal");
    if (modal) modal.classList.remove("show");
}

function closeEditPlaylistModal() {
    const modal = document.getElementById("editPlaylistModal");
    if (modal) modal.classList.remove("show");
    currentEditingPlaylist = null;
}

function closeViewPlaylistModal() {
    const modal = document.getElementById("playlistViewModal");
    if (modal) modal.classList.remove("show");
    currentViewingPlaylist = null;
}

function setupDragAndDrop() {
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        for (let file of files) {
            if (file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                const newSong = {
                    id: Date.now() + Math.random(),
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Imported",
                    src: url,
                    cover: ""
                };
                songsList.push(newSong);
                localStorage.setItem('kroko_songs', JSON.stringify(songsList));
                renderSongs(songsList, "songGrid");
                alert(`Added: ${newSong.title}`);
            }
        }
    });
}

function setupHotkeys() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            const playBtn = document.getElementById("play");
            if (playBtn) playBtn.click();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            const prevBtn = document.getElementById("prev");
            if (prevBtn) prevBtn.click();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            const nextBtn = document.getElementById("next");
            if (nextBtn) nextBtn.click();
        }
    });
}

// ========== ДОПОМІЖНІ ФУНКЦІЇ ==========

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Запуск додатку
initApp();