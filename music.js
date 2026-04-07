// ========== СИСТЕМА РЕЄСТРАЦІЇ ==========
let currentUser = null;
let users = JSON.parse(localStorage.getItem('kroko_users')) || [];

// Перевіряємо, чи є авторизований користувач
const savedUser = localStorage.getItem('kroko_current_user');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
}

// ========== ГЛОБАЛЬНІ ЗМІННІ ==========
let songsList = [];
let favorites = [];
let customPlaylists = [];
let listenCounts = {};

// Початковий список музики (ВАЖЛИВО: переконайтеся, що файли music.mp3 існують!)
const defaultSongs = [
    { id: 1, title: "прыгай,дура!", artist: "CUPSIZE", src: "music.mp3", cover: "https://images.genius.com/f75ad29ed7f6bf44dd554844d23954ad.1000x1000x1.png" },
    { id: 2, title: "я схожу с ума", artist: "CUPSIZE", src: "music2.mp3", cover: "https://i1.sndcdn.com/artworks-1FqzgRqmibvGLWB6-46ZxdQ-t500x500.jpg" },
    { id: 3, title: "юра,юра", artist: "CUPSIZE", src: "music3.mp3", cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHGgqDx2FSOQQ5ismVnwpqscRT4VQ4Tv-sdQ&s" },
    { id: 4, title: "Phonk Night", artist: "Kroko", src: "music.mp3", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400" }
];

let currentTrackIndex = 0;
let isPlaying = false;
let currentThemeColor = "#7c3aed";
let currentEditingPlaylist = null;
let currentViewingPlaylist = null;
let activePlaylist = null;
let shuffleMode = false;
let shuffledIndices = [];
let currentShuffleIndex = 0;
let currentPlaybackRate = 1;

const audio = document.getElementById("audio");

// ========== ФУНКЦІЇ РЕЄСТРАЦІЇ ==========

function initAuth() {
    if (currentUser) {
        loadUserData();
        document.getElementById("authModal").classList.remove("auth-modal-show");
        document.getElementById("appShell").style.display = "grid";
        initApp();
        return;
    }
    
    document.getElementById("authModal").classList.add("auth-modal-show");
    document.getElementById("appShell").style.display = "none";
    
    // Перемикання між формами
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-auth-tab');
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('loginForm').classList.remove('active');
            document.getElementById('registerForm').classList.remove('active');
            document.getElementById(`${target}Form`).classList.add('active');
        });
    });
    
    // Перемикання за посиланнями
    document.querySelectorAll('.auth-link').forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-switch-to');
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelector(`.auth-tab[data-auth-tab="${target}"]`).classList.add('active');
            document.getElementById('loginForm').classList.remove('active');
            document.getElementById('registerForm').classList.remove('active');
            document.getElementById(`${target}Form`).classList.add('active');
        });
    });
    
    // Вибір кольору аватара
    let selectedAvatarColor = "#7c3aed";
    document.querySelectorAll('.avatar-color').forEach(color => {
        color.addEventListener('click', () => {
            document.querySelectorAll('.avatar-color').forEach(c => c.classList.remove('selected'));
            color.classList.add('selected');
            selectedAvatarColor = color.getAttribute('data-color');
        });
    });
    
    // Реєстрація
    document.getElementById("registerBtn").onclick = () => {
        const name = document.getElementById("regName").value.trim();
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("regConfirmPassword").value;
        
        if (!name || !username || !email || !password) {
            alert("Please fill all fields");
            return;
        }
        
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        
        if (users.find(u => u.username === username)) {
            alert("Username already exists");
            return;
        }
        
        if (users.find(u => u.email === email)) {
            alert("Email already registered");
            return;
        }
        
        const newUser = {
            id: Date.now(),
            name: name,
            username: username,
            email: email,
            password: password,
            avatarColor: selectedAvatarColor,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('kroko_users', JSON.stringify(users));
        
        currentUser = newUser;
        localStorage.setItem('kroko_current_user', JSON.stringify(currentUser));
        
        initializeUserData();
        
        alert("Registration successful!");
        document.getElementById("authModal").classList.remove("auth-modal-show");
        document.getElementById("appShell").style.display = "grid";
        loadUserData();
        initApp();
    };
    
    // Вхід
    document.getElementById("loginBtn").onclick = () => {
        const loginInput = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        
        const user = users.find(u => (u.username === loginInput || u.email === loginInput) && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('kroko_current_user', JSON.stringify(currentUser));
            loadUserData();
            document.getElementById("authModal").classList.remove("auth-modal-show");
            document.getElementById("appShell").style.display = "grid";
            initApp();
        } else {
            alert("Invalid username/email or password");
        }
    };
}

function initializeUserData() {
    if (!currentUser) return;
    
    if (!localStorage.getItem(`kroko_songs_${currentUser.id}`)) {
        localStorage.setItem(`kroko_songs_${currentUser.id}`, JSON.stringify(defaultSongs));
        localStorage.setItem(`kroko_favs_${currentUser.id}`, JSON.stringify([]));
        localStorage.setItem(`kroko_playlists_${currentUser.id}`, JSON.stringify([]));
        localStorage.setItem(`kroko_listens_${currentUser.id}`, JSON.stringify({}));
    }
}

function loadUserData() {
    if (!currentUser) return;
    
    const savedSongs = localStorage.getItem(`kroko_songs_${currentUser.id}`);
    songsList = savedSongs ? JSON.parse(savedSongs) : defaultSongs;
    favorites = JSON.parse(localStorage.getItem(`kroko_favs_${currentUser.id}`)) || [];
    customPlaylists = JSON.parse(localStorage.getItem(`kroko_playlists_${currentUser.id}`)) || [];
    listenCounts = JSON.parse(localStorage.getItem(`kroko_listens_${currentUser.id}`)) || {};
    currentThemeColor = localStorage.getItem(`user_theme_${currentUser.id}`) || currentUser.avatarColor || "#7c3aed";
    currentPlaybackRate = parseFloat(localStorage.getItem(`kroko_playback_rate_${currentUser.id}`)) || 1;
}

function saveAllUserData() {
    if (!currentUser) return;
    
    localStorage.setItem(`kroko_songs_${currentUser.id}`, JSON.stringify(songsList));
    localStorage.setItem(`kroko_favs_${currentUser.id}`, JSON.stringify(favorites));
    localStorage.setItem(`kroko_playlists_${currentUser.id}`, JSON.stringify(customPlaylists));
    localStorage.setItem(`kroko_listens_${currentUser.id}`, JSON.stringify(listenCounts));
    localStorage.setItem(`user_theme_${currentUser.id}`, currentThemeColor);
    localStorage.setItem(`kroko_playback_rate_${currentUser.id}`, currentPlaybackRate);
}

function logout() {
    localStorage.removeItem('kroko_current_user');
    location.reload();
}

function deleteAccount() {
    if (confirm("Are you sure you want to delete your account? ALL DATA will be lost!")) {
        users = users.filter(u => u.id !== currentUser.id);
        localStorage.setItem('kroko_users', JSON.stringify(users));
        
        localStorage.removeItem(`kroko_songs_${currentUser.id}`);
        localStorage.removeItem(`kroko_favs_${currentUser.id}`);
        localStorage.removeItem(`kroko_playlists_${currentUser.id}`);
        localStorage.removeItem(`kroko_listens_${currentUser.id}`);
        localStorage.removeItem(`user_theme_${currentUser.id}`);
        localStorage.removeItem(`kroko_playback_rate_${currentUser.id}`);
        localStorage.removeItem('kroko_current_user');
        
        location.reload();
    }
}

// ========== ОСНОВНІ ФУНКЦІЇ ДОДАТКУ ==========

function initApp() {
    const userName = currentUser ? currentUser.name : "User";
    const displayName = document.getElementById("displayUserName");
    const userAvatar = document.getElementById("userAvatar");
    const nameInput = document.getElementById("nameInput");
    
    if (displayName) displayName.innerText = userName;
    if (userAvatar) {
        userAvatar.innerText = userName[0].toUpperCase();
        userAvatar.style.background = currentThemeColor;
    }
    if (nameInput) nameInput.value = userName;
    
    applyTheme(currentThemeColor);
    renderSongs(songsList, "songGrid");
    renderSongs(songsList, "playlistGrid");
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
    
    const rateSelect = document.getElementById("playbackRate");
    if (rateSelect) {
        rateSelect.value = currentPlaybackRate.toString();
        audio.playbackRate = currentPlaybackRate;
    }
    
    const mainLikeBtn = document.getElementById("mainLikeBtn");
    if (mainLikeBtn) mainLikeBtn.onclick = toggleFavorite;
    
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.onclick = logout;
    
    const deleteAccountBtn = document.getElementById("resetBtn");
    if (deleteAccountBtn) deleteAccountBtn.onclick = deleteAccount;
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
        if (index < 0 || index >= songsList.length) return;
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
    audio.onerror = () => {
        console.error("Error loading audio:", song.src);
        const loader = document.getElementById("loadingIndicator");
        if (loader) loader.style.display = "none";
        alert(`Cannot load audio file: ${song.title}\nMake sure the file ${song.src} exists in the same folder.`);
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

// ========== ФУНКЦІЇ ДЛЯ ПЛЕЙЛИСТІВ (скорочені) ==========

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
    
    document.getElementById("playPlaylistBtn").onclick = () => playPlaylist(playlist.id, false);
    document.getElementById("shufflePlaylistBtn").onclick = () => playPlaylist(playlist.id, true);
    
    document.getElementById("playlistViewModal").classList.add("show");
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
        }
    } else {
        if (currentTrackIndex + 1 < activePlaylist.songs.length) {
            loadTrack(currentTrackIndex + 1, true);
            playTrack(currentTrackIndex + 1, true);
            return true;
        }
    }
    activePlaylist = null;
    document.getElementById("playlistIndicator").innerText = "";
    return false;
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
    } else {
        if (currentTrackIndex - 1 >= 0) {
            loadTrack(currentTrackIndex - 1, true);
            playTrack(currentTrackIndex - 1, true);
            return true;
        }
    }
    return false;
}

function createPlaylist() {
    const playlistName = document.getElementById("playlistNameInput").value.trim();
    if (!playlistName) {
        alert("Please enter a playlist name");
        return;
    }
    
    const fileInput = document.getElementById("playlistCoverInput");
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const newPlaylist = {
                id: Date.now(),
                name: playlistName,
                songs: [],
                cover: e.target.result
            };
            customPlaylists.push(newPlaylist);
            saveAllUserData();
            renderPlaylists();
            closeCreatePlaylistModal();
            document.getElementById("playlistNameInput").value = "";
            fileInput.value = "";
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const newPlaylist = {
            id: Date.now(),
            name: playlistName,
            songs: [],
            cover: null
        };
        customPlaylists.push(newPlaylist);
        saveAllUserData();
        renderPlaylists();
        closeCreatePlaylistModal();
        document.getElementById("playlistNameInput").value = "";
    }
}

function editPlaylist(playlistId) {
    currentEditingPlaylist = customPlaylists.find(p => p.id === playlistId);
    if (!currentEditingPlaylist) return;
    
    document.getElementById("editPlaylistTitle").innerText = `Edit: ${currentEditingPlaylist.name}`;
    document.getElementById("editPlaylistNameInput").value = currentEditingPlaylist.name;
    
    const preview = document.getElementById("editCoverPreview");
    if (preview && currentEditingPlaylist.cover) {
        preview.innerHTML = `<img src="${currentEditingPlaylist.cover}" alt="cover">`;
    } else if (preview) {
        preview.innerHTML = '';
    }
    
    renderPlaylistSongs();
    renderAvailableSongs();
    document.getElementById("editPlaylistModal").classList.add("show");
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
        saveAllUserData();
        renderPlaylistSongs();
        renderAvailableSongs();
    }
}

function removeSongFromPlaylist(songId) {
    if (currentEditingPlaylist) {
        currentEditingPlaylist.songs = currentEditingPlaylist.songs.filter(s => s.id !== songId);
        saveAllUserData();
        renderPlaylistSongs();
        renderAvailableSongs();
    }
}

function savePlaylistChanges() {
    const newName = document.getElementById("editPlaylistNameInput").value.trim();
    if (newName && currentEditingPlaylist) {
        currentEditingPlaylist.name = newName;
    }
    
    const fileInput = document.getElementById("editPlaylistCoverInput");
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentEditingPlaylist.cover = e.target.result;
            saveAllUserData();
            renderPlaylists();
            closeEditPlaylistModal();
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveAllUserData();
        renderPlaylists();
        closeEditPlaylistModal();
    }
}

function removePlaylistCover() {
    if (currentEditingPlaylist) {
        currentEditingPlaylist.cover = null;
        document.getElementById("editCoverPreview").innerHTML = '';
        saveAllUserData();
        renderPlaylists();
    }
}

function deletePlaylist(playlistId) {
    if (confirm("Are you sure you want to delete this playlist?")) {
        customPlaylists = customPlaylists.filter(p => p.id !== playlistId);
        saveAllUserData();
        renderPlaylists();
        if (activePlaylist && activePlaylist.id === playlistId) {
            activePlaylist = null;
            document.getElementById("playlistIndicator").innerText = "";
        }
        if (currentEditingPlaylist && currentEditingPlaylist.id === playlistId) {
            closeEditPlaylistModal();
        }
        if (currentViewingPlaylist && currentViewingPlaylist.id === playlistId) {
            closeViewPlaylistModal();
        }
    }
}

// ========== ФУНКЦІЇ ДЛЯ ОБРАНИХ ==========

function toggleFavorite() {
    let currentSong = activePlaylist && activePlaylist.songs[currentTrackIndex] 
        ? activePlaylist.songs[currentTrackIndex] 
        : songsList[currentTrackIndex];
    
    const index = favorites.findIndex(fav => fav.id === currentSong.id);
    if (index === -1) {
        favorites.push(currentSong);
    } else {
        favorites.splice(index, 1);
    }
    saveAllUserData();
    updateLikeUI();
}

function removeFromFavorites(songId) {
    favorites = favorites.filter(fav => fav.id !== songId);
    saveAllUserData();
    renderFavorites();
    updateLikeUI();
}

function updateLikeUI() {
    let currentSong = activePlaylist && activePlaylist.songs[currentTrackIndex] 
        ? activePlaylist.songs[currentTrackIndex] 
        : songsList[currentTrackIndex];
    const isFav = favorites.some(fav => fav.id === currentSong.id);
    const btn = document.getElementById("mainLikeBtn");
    if (btn) {
        btn.innerText = isFav ? "♥" : "♡";
        btn.classList.toggle("active", isFav);
    }
}

// ========== ПЛЕЄР ==========

function playTrack(index, fromPlaylist = false) {
    if (index !== undefined && !fromPlaylist) {
        activePlaylist = null;
        shuffleMode = false;
        document.getElementById("playlistIndicator").innerText = "";
        document.getElementById("shuffleBtn")?.classList.remove("shuffle-active");
        loadTrack(index);
    }
    
    audio.play().catch(e => console.log("Play error:", e));
    isPlaying = true;
    document.getElementById("play").innerText = "⏸";
    
    let currentSong = activePlaylist && activePlaylist.songs[currentTrackIndex] 
        ? activePlaylist.songs[currentTrackIndex] 
        : songsList[currentTrackIndex];
    if (currentSong) {
        listenCounts[currentSong.id] = (listenCounts[currentSong.id] || 0) + 1;
        saveAllUserData();
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
                document.getElementById("progressFill").style.width = percent + "%";
                document.getElementById("currentTime").innerText = formatTime(audio.currentTime);
                document.getElementById("duration").innerText = formatTime(audio.duration);
                document.getElementById("progress").value = percent;
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
            document.getElementById("volumeFill").style.width = (e.target.value * 100) + "%";
        };
    }
    
    if (playbackRateSelect) {
        playbackRateSelect.onchange = (e) => {
            currentPlaybackRate = parseFloat(e.target.value);
            audio.playbackRate = currentPlaybackRate;
            saveAllUserData();
        };
    }
    
    if (audio) {
        audio.onended = () => {
            if (activePlaylist) {
                if (!nextInPlaylist()) {
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

// ========== МОДАЛЬНІ ВІКНА ==========

function setupModals() {
    document.getElementById("createPlaylistBtn").onclick = () => {
        document.getElementById("createPlaylistModal").classList.add("show");
    };
    document.getElementById("confirmCreatePlaylistBtn").onclick = createPlaylist;
    document.getElementById("closePlaylistModalBtn").onclick = closeCreatePlaylistModal;
    
    document.getElementById("savePlaylistChangesBtn").onclick = savePlaylistChanges;
    document.getElementById("deletePlaylistBtn").onclick = () => {
        if (currentEditingPlaylist) deletePlaylist(currentEditingPlaylist.id);
    };
    document.getElementById("closeEditModalBtn").onclick = closeEditPlaylistModal;
    document.getElementById("removeCoverBtn").onclick = removePlaylistCover;
    
    document.getElementById("closeViewModalBtn").onclick = closeViewPlaylistModal;
    
    document.getElementById("settingsBtn").onclick = () => {
        document.getElementById("settingsModal").classList.add("show");
    };
    document.getElementById("saveSettingsBtn").onclick = () => {
        const newName = document.getElementById("nameInput").value.trim();
        if (newName && currentUser) {
            currentUser.name = newName;
            users = users.map(u => u.id === currentUser.id ? currentUser : u);
            localStorage.setItem('kroko_users', JSON.stringify(users));
            localStorage.setItem('kroko_current_user', JSON.stringify(currentUser));
            document.getElementById("displayUserName").innerText = newName;
            document.getElementById("userAvatar").innerText = newName[0].toUpperCase();
        }
        localStorage.setItem(`user_theme_${currentUser.id}`, currentThemeColor);
        document.getElementById("settingsModal").classList.remove("show");
    };
    document.getElementById("closeSettingsBtn").onclick = () => {
        document.getElementById("settingsModal").classList.remove("show");
    };
    
    document.getElementById("profileBtn").onclick = (e) => {
        e.stopPropagation();
        document.getElementById("accountMenu").classList.toggle("show");
    };
    document.addEventListener("click", () => {
        document.getElementById("accountMenu").classList.remove("show");
    });
    
    document.getElementById("logoHome").onclick = () => switchTab("discover");
    
    document.getElementById("exportPlaylistsBtn").onclick = () => {
        const dataStr = JSON.stringify(customPlaylists, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `playlists_${currentUser?.username || 'user'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    document.getElementById("importPlaylistsBtn").onclick = () => {
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
                            saveAllUserData();
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

function closeCreatePlaylistModal() {
    document.getElementById("createPlaylistModal").classList.remove("show");
}

function closeEditPlaylistModal() {
    document.getElementById("editPlaylistModal").classList.remove("show");
    currentEditingPlaylist = null;
}

function closeViewPlaylistModal() {
    document.getElementById("playlistViewModal").classList.remove("show");
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
                saveAllUserData();
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
            document.getElementById("play")?.click();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById("prev")?.click();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            document.getElementById("next")?.click();
        }
    });
}

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

// Запуск
initAuth(); 