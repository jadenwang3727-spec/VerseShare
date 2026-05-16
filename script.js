const storageKey = 'verseSharePoems';
const poemForm = document.getElementById('poemForm');
const feedList = document.getElementById('feedList');
const toast = document.getElementById('toast');
const clearBtn = document.getElementById('clearBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const themeToggle = document.getElementById('themeToggle');
const adminToggle = document.getElementById('adminToggle');
const adminPanel = document.getElementById('adminPanel');
const adminContent = document.getElementById('adminContent');
const themeKey = 'verseShareTheme';

const ADMIN_PASS = 'verseadmin';
let adminActive = false;

const defaultPoems = [
    {
        id: crypto.randomUUID(),
        title: 'Where Light Sleeps',
        author: 'M.@verse',
        content: 'the city hums beneath a glass bright sky\nI trace the quiet in the space between words\nand learn how to listen to the world\none heartbeat at a time',
        tags: ['night', 'stillness'],
        theme: 'Reflection',
        createdAt: Date.now() - 86400000,
        comments: [],
        approved: true,
        rejected: false,
        reviewNotes: 'Approved by default'
    },
    {
        id: crypto.randomUUID(),
        title: 'A Quiet Bloom',
        author: 'Nova',
        content: 'the petals were secrets\nopened only for the moon\nin a garden of unspoken promises',
        tags: ['nature', 'hope'],
        theme: 'Growth',
        createdAt: Date.now() - 43200000,
        comments: [],
        approved: false,
        rejected: false,
        reviewNotes: ''
    }
];

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.remove('visible');
    }, 2400);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatText(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Activate light mode' : 'Activate dark mode');
    localStorage.setItem(themeKey, theme);
}

function getPreferredTheme() {
    const stored = localStorage.getItem(themeKey);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme || getPreferredTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
    applyTheme(getPreferredTheme());
}

function loadPoems() {
    try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return defaultPoems.slice();
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : defaultPoems.slice();
    } catch (error) {
        console.error('Could not load saved poems', error);
        return defaultPoems.slice();
    }
}

function savePoems(poems) {
    localStorage.setItem(storageKey, JSON.stringify(poems));
}

function createTagList(tags) {
    if (!tags?.length) return '';
    return tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('');
}

function formatDate(timestamp) {
    return new Intl.DateTimeFormat('default', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(timestamp));
}

const reactionOptions = ['❤️', '🔥', '✨', '😂', '🎉', '🎬'];

function renderComments(comments, poemId) {
    if (!comments || !comments.length) {
        return '<p class="small-copy">No comments yet. Leave a note for the author below.</p>';
    }

    return comments
        .map(comment => {
            const reactions = Object.entries(comment.reactions || {})
                .filter(([, count]) => count > 0)
                .map(([reaction, count]) => `<span class="reaction-chip">${reaction} ${count}</span>`)
                .join('');

            const replyHtml = (comment.replies || [])
                .map(reply => `
                    <div class="comment-reply">
                        <div class="comment-meta comment-reply-meta">
                            <span>${escapeHtml(reply.author)}</span>
                            <span>${formatDate(reply.createdAt)}</span>
                        </div>
                        <p>${formatText(reply.text)}</p>
                    </div>
                `)
                .join('');

            return `
                <div class="comment-item" data-comment-id="${comment.id}" data-poem-id="${poemId}">
                    <div class="comment-meta comment-header">
                        <strong>${escapeHtml(comment.author)}</strong>
                        <span>${formatDate(comment.createdAt)}</span>
                    </div>
                    <p class="comment-text">${formatText(comment.text)}</p>
                    <div class="comment-actions">
                        <button type="button" class="comment-button" data-action="reply-toggle" data-poem-id="${poemId}" data-comment-id="${comment.id}">Reply</button>
                        ${reactions}
                    </div>
                    <div class="reaction-palette">
                        ${reactionOptions.map(reaction => `
                            <button type="button" class="reaction-button" data-action="add-reaction" data-poem-id="${poemId}" data-comment-id="${comment.id}" data-reaction="${reaction}">${reaction}</button>
                        `).join('')}
                    </div>
                    <div class="reply-panel" id="reply-${comment.id}" hidden>
                        <input type="text" class="reply-author" placeholder="Your name" />
                        <textarea class="reply-text" rows="2" placeholder="Reply to this comment..."></textarea>
                        <button type="button" class="button button-secondary" data-action="post-reply" data-poem-id="${poemId}" data-comment-id="${comment.id}">Post reply</button>
                    </div>
                    <div class="comment-replies">${replyHtml}</div>
                </div>
            `;
        })
        .join('');
}

function renderFeed(poems) {
    const approvedPoems = poems.filter(poem => poem.approved && !poem.rejected);
    if (!approvedPoems.length) {
        feedList.innerHTML = '<p class="small-copy">No approved poems are available yet. Please check back after an admin review.</p>';
        return;
    }

    const content = approvedPoems
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(poem => {
            const tagHtml = createTagList(poem.tags);
            const commentCount = poem.comments ? poem.comments.length : 0;
            return `
            <article class="poem-card">
                <header>
                    <div>
                        <h3>${escapeHtml(poem.title)}</h3>
                        <div class="poem-meta">${escapeHtml(poem.theme || 'Original')}</div>
                    </div>
                    <div class="poem-meta">${escapeHtml(poem.author)} · ${formatDate(poem.createdAt)}</div>
                </header>
                <p class="poem-copy">${formatText(poem.content)}</p>
                <div class="tag-list">${tagHtml}</div>
                <div class="poem-actions">
                    <button type="button" data-action="copy" data-id="${poem.id}">Copy text</button>
                    <button type="button" data-action="share" data-id="${poem.id}">Share</button>
                </div>
                <div class="comment-panel">
                    <div class="comment-panel-header">
                        <div>
                            <h4>Discussion</h4>
                            <p class="small-copy">Write a comment to the author, reply to readers, or react with emoji and GIF-style reactions.</p>
                        </div>
                        <span>${commentCount} comments</span>
                    </div>
                    <div class="comment-composer" data-poem-id="${poem.id}">
                        <input class="comment-author-input" type="text" placeholder="Your name" />
                        <textarea class="comment-text-input" rows="3" placeholder="Leave a message for the author..."></textarea>
                        <div class="composer-actions">
                            <button type="button" class="button button-primary" data-action="post-comment" data-poem-id="${poem.id}">Post comment</button>
                        </div>
                    </div>
                    <div class="comment-list">${renderComments(poem.comments || [], poem.id)}</div>
                </div>
            </article>
            `;
        })
        .join('');

    feedList.innerHTML = content;
}

function updateFeed() {
    const poems = loadPoems();
    renderFeed(poems);
}

function normalizeTags(raw) {
    return raw
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.replace(/[^\w\s-]/g, ''))
        .slice(0, 6);
}

function clearForm() {
    poemForm.reset();
    document.getElementById('poemTitle').focus();
}

function handleFormSubmit(event) {
    event.preventDefault();
    const title = document.getElementById('poemTitle').value.trim();
    const author = document.getElementById('poemAuthor').value.trim();
    const content = document.getElementById('poemContent').value.trim();
    const theme = document.getElementById('poemTheme').value.trim();
    const tags = normalizeTags(document.getElementById('poemTags').value);

    if (!title || !author || !content) {
        showToast('Please complete the title, author, and poem content.');
        return;
    }

    const poems = loadPoems();
    const newPoem = {
        id: crypto.randomUUID(),
        title,
        author,
        content,
        theme,
        tags,
        createdAt: Date.now(),
        comments: [],
        approved: false,
        rejected: false,
        reviewNotes: ''
    };

    poems.push(newPoem);
    savePoems(poems);
    renderFeed(poems);
    clearForm();
    showToast('Your poem has been submitted and is pending admin approval.');
}

function findPoem(poemId) {
    const poems = loadPoems();
    return poems.find(item => item.id === poemId);
}

function saveCommentState(poem) {
    const poems = loadPoems();
    const index = poems.findIndex(item => item.id === poem.id);
    if (index === -1) return;
    poems[index] = poem;
    savePoems(poems);
}

function handlePostComment(button) {
    const poemId = button.dataset.poemId;
    const poem = findPoem(poemId);
    if (!poem) return;

    const composer = button.closest('.comment-composer');
    const authorInput = composer.querySelector('.comment-author-input');
    const textInput = composer.querySelector('.comment-text-input');
    const author = authorInput.value.trim();
    const text = textInput.value.trim();

    if (!author || !text) {
        showToast('Please enter your name and comment.');
        return;
    }

    const comment = {
        id: crypto.randomUUID(),
        author,
        text,
        createdAt: Date.now(),
        replies: [],
        reactions: {}
    };

    poem.comments = poem.comments || [];
    poem.comments.push(comment);
    saveCommentState(poem);
    updateFeed();
    showToast('Comment added.');
}

function handleReplyToggle(button) {
    const commentId = button.dataset.commentId;
    const replyPanel = document.getElementById(`reply-${commentId}`);
    if (!replyPanel) return;
    replyPanel.hidden = !replyPanel.hidden;
}

function handlePostReply(button) {
    const poemId = button.dataset.poemId;
    const commentId = button.dataset.commentId;
    const poem = findPoem(poemId);
    if (!poem) return;

    const replyPanel = button.closest('.reply-panel');
    const authorInput = replyPanel.querySelector('.reply-author');
    const textInput = replyPanel.querySelector('.reply-text');
    const author = authorInput.value.trim();
    const text = textInput.value.trim();

    if (!author || !text) {
        showToast('Please enter your name and reply.');
        return;
    }

    const comment = (poem.comments || []).find(item => item.id === commentId);
    if (!comment) return;

    comment.replies = comment.replies || [];
    comment.replies.push({
        id: crypto.randomUUID(),
        author,
        text,
        createdAt: Date.now()
    });

    saveCommentState(poem);
    updateFeed();
    showToast('Reply posted.');
}

function renderAdminPanel(poems) {
    const total = poems.length;
    const pending = poems.filter(poem => !poem.approved && !poem.rejected);
    const approvedCount = poems.filter(poem => poem.approved && !poem.rejected).length;
    const rejected = poems.filter(poem => poem.rejected);

    if (!total) {
        adminContent.innerHTML = '<p class="small-copy">No submissions are available for review yet.</p>';
        return;
    }

    const content = `
        <div class="admin-card">
            <header>
                <div>
                    <h3>Submission overview</h3>
                    <p class="admin-note">Pending ${pending.length} • Approved ${approvedCount} • Rejected ${rejected.length}</p>
                </div>
                <span class="admin-status">Admin mode</span>
            </header>
        </div>
        ${poems
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(poem => {
                const statusLabel = poem.rejected ? 'Rejected' : poem.approved ? 'Approved' : 'Pending';
                const tagHtml = createTagList(poem.tags);
                const statusClass = poem.approved ? 'approved' : poem.rejected ? 'rejected' : 'pending';

                return `
                <div class="admin-card">
                    <header>
                        <div>
                            <p class="eyebrow">${statusLabel}</p>
                            <h3>${escapeHtml(poem.title)}</h3>
                            <p class="admin-note">${escapeHtml(poem.author)} · ${formatDate(poem.createdAt)}</p>
                        </div>
                        <span class="admin-status ${statusClass}">${statusLabel}</span>
                    </header>
                    <p class="poem-copy">${formatText(poem.content)}</p>
                    <div class="tag-list">${tagHtml}</div>
                    <p class="admin-note">Review note: ${escapeHtml(poem.reviewNotes || 'No note yet')}</p>
                    <div class="admin-actions">
                        <button type="button" class="button button-primary" data-action="approve-poem" data-id="${poem.id}">Approve</button>
                        <button type="button" class="button button-secondary" data-action="reject-poem" data-id="${poem.id}">Reject</button>
                    </div>
                </div>
            `;
            })
            .join('')}
    `;

    adminContent.innerHTML = content;
}

function handleApprovePoem(button) {
    const poemId = button.dataset.id;
    const poem = findPoem(poemId);
    if (!poem) return;
    poem.approved = true;
    poem.rejected = false;
    poem.reviewNotes = 'Approved by admin';
    savePoems(loadPoems().map(item => item.id === poemId ? poem : item));
    renderAdminPanel(loadPoems());
    if (!adminActive) updateFeed();
    showToast('Poem approved.');
}

function handleRejectPoem(button) {
    const poemId = button.dataset.id;
    const poem = findPoem(poemId);
    if (!poem) return;
    const reason = prompt('Enter rejection note or inappropriate reason:');
    if (reason === null) return;
    poem.approved = false;
    poem.rejected = true;
    poem.reviewNotes = reason.trim() || 'Rejected without note';
    savePoems(loadPoems().map(item => item.id === poemId ? poem : item));
    renderAdminPanel(loadPoems());
    if (!adminActive) updateFeed();
    showToast('Poem rejected.');
}

function handleAdminClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'approve-poem') {
        handleApprovePoem(button);
    }
    if (action === 'reject-poem') {
        handleRejectPoem(button);
    }
}

function toggleAdminMode() {
    if (!adminActive) {
        const pass = prompt('Enter admin passphrase to open the admin side:');
        if (pass !== ADMIN_PASS) {
            showToast('Incorrect passphrase.');
            return;
        }
    }

    adminActive = !adminActive;
    document.body.classList.toggle('admin-active', adminActive);
    adminPanel.classList.toggle('hidden', !adminActive);
    adminToggle.textContent = adminActive ? 'User side' : 'Admin side';
    adminToggle.classList.toggle('button-primary', adminActive);
    adminToggle.classList.toggle('button-secondary', !adminActive);
    if (adminActive) {
        renderAdminPanel(loadPoems());
    }
}

function handleAddReaction(button) {
    const poemId = button.dataset.poemId;
    const commentId = button.dataset.commentId;
    const reaction = button.dataset.reaction;
    const poem = findPoem(poemId);
    if (!poem) return;

    const comment = (poem.comments || []).find(item => item.id === commentId);
    if (!comment) return;
    comment.reactions = comment.reactions || {};
    comment.reactions[reaction] = (comment.reactions[reaction] || 0) + 1;

    saveCommentState(poem);
    updateFeed();
}

function handleFeedClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'copy' || action === 'share') {
        const poemId = button.dataset.id;
        const poem = findPoem(poemId);
        if (!poem) return;

        if (action === 'copy') {
            navigator.clipboard.writeText(`${poem.title}\n${poem.author}\n\n${poem.content}`)
                .then(() => showToast('Poem text copied to clipboard.'))
                .catch(() => showToast('Unable to copy text.'));
        }

        if (action === 'share') {
            const shareText = `${poem.title} by ${poem.author}\n\n${poem.content}`;
            if (navigator.share) {
                navigator.share({
                    title: poem.title,
                    text: shareText
                }).catch(() => showToast('Sharing canceled.'));
            } else {
                navigator.clipboard.writeText(shareText)
                    .then(() => showToast('Share text copied. Paste it anywhere to share.'))
                    .catch(() => showToast('Unable to copy share text.'));
            }
        }

        return;
    }

    if (action === 'post-comment') {
        handlePostComment(button);
        return;
    }

    if (action === 'reply-toggle') {
        handleReplyToggle(button);
        return;
    }

    if (action === 'post-reply') {
        handlePostReply(button);
        return;
    }

    if (action === 'add-reaction') {
        handleAddReaction(button);
        return;
    }
}

function loadSamplePoem() {
    document.getElementById('poemTitle').value = 'Summer Quiet';
    document.getElementById('poemAuthor').value = 'Luna';
    document.getElementById('poemContent').value = 'evening drips slow across the lake\nwhispers of gold in each gentle wave\ni trace a line of sunlight back to you';
    document.getElementById('poemTheme').value = 'Nature';
    document.getElementById('poemTags').value = 'summer, quiet, memory';
}

poemForm.addEventListener('submit', handleFormSubmit);
clearBtn.addEventListener('click', clearForm);
loadSampleBtn.addEventListener('click', loadSamplePoem);
feedList.addEventListener('click', handleFeedClick);
adminPanel.addEventListener('click', handleAdminClick);
adminToggle.addEventListener('click', toggleAdminMode);
themeToggle.addEventListener('click', toggleTheme);

initTheme();
updateFeed();
