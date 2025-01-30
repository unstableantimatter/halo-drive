class SpectatorCommentary {
    constructor(spectatorView) {
        this.spectatorView = spectatorView;
        this.comments = new Map(); // timestamp -> [{user, comment, timestamp}]
        this.setupHandlers();
    }

    setupHandlers() {
        this.spectatorView.socket.on('comment_added', (data) => {
            this.addComment(data.timestamp, data.userId, data.comment);
            this.updateCommentsUI();
        });
    }

    addComment(timestamp, userId, comment) {
        const comments = this.comments.get(timestamp) || [];
        comments.push({
            userId,
            comment,
            timestamp: Date.now()
        });
        this.comments.set(timestamp, comments);
    }

    sendComment(timestamp, comment) {
        this.spectatorView.socket.emit('add_comment', {
            timestamp,
            comment,
            gameId: this.spectatorView.gameId
        });
    }

    generateHighlightDescription(highlight) {
        const players = highlight.players.map(id => 
            this.spectatorView.network.players.get(id)?.username
        ).join(' and ');

        const descriptions = {
            near_miss: `Close call between ${players}! 😱`,
            overtake: `Incredible overtake by ${players}! 🏎️`,
            speed_record: `New speed record set by ${players}! ⚡`,
            low_fuel: `${players} pushing the limits with low fuel! ⛽`,
            gravity_slingshot: `Perfect slingshot maneuver by ${players}! 🌌`,
            perfect_line: `${players} nails the racing line! 🎯`,
            fuel_save: `Masterful fuel management by ${players}! ♻️`,
            comeback: `Amazing comeback from ${players}! 🚀`
        };

        return descriptions[highlight.type] || `Exciting moment from ${players}!`;
    }

    shareHighlight(highlight, platform) {
        const description = this.generateHighlightDescription(highlight);
        const gameUrl = `${window.location.origin}/game/${this.spectatorView.gameId}?t=${highlight.timestamp}`;
        
        const shareUrls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(description)}&url=${encodeURIComponent(gameUrl)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}&quote=${encodeURIComponent(description)}`,
            reddit: `https://reddit.com/submit?url=${encodeURIComponent(gameUrl)}&title=${encodeURIComponent(description)}`,
            clipboard: async () => {
                try {
                    await navigator.clipboard.writeText(`${description}\n${gameUrl}`);
                    this.showNotification('Link copied to clipboard!');
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            }
        };

        if (typeof shareUrls[platform] === 'function') {
            shareUrls[platform]();
        } else {
            window.open(shareUrls[platform], '_blank');
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'share-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    renderCommentSection(highlight) {
        const comments = this.comments.get(highlight.timestamp) || [];
        return `
            <div class="highlight-comments">
                <div class="comments-list">
                    ${comments.map(comment => `
                        <div class="comment">
                            <span class="comment-user">${this.spectatorView.network.players.get(comment.userId)?.username}</span>
                            <span class="comment-text">${this.escapeHtml(comment.comment)}</span>
                            <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="comment-input">
                    <input type="text" placeholder="Add a comment...">
                    <button onclick="commentary.sendComment(${highlight.timestamp}, this.previousElementSibling.value)">
                        Send
                    </button>
                </div>
                <div class="share-buttons">
                    <button onclick="commentary.shareHighlight(${JSON.stringify(highlight)}, 'twitter')">
                        Share on Twitter
                    </button>
                    <button onclick="commentary.shareHighlight(${JSON.stringify(highlight)}, 'facebook')">
                        Share on Facebook
                    </button>
                    <button onclick="commentary.shareHighlight(${JSON.stringify(highlight)}, 'reddit')">
                        Share on Reddit
                    </button>
                    <button onclick="commentary.shareHighlight(${JSON.stringify(highlight)}, 'clipboard')">
                        Copy Link
                    </button>
                </div>
            </div>
        `;
    }
} 