// ============================================
// PHISHNET CHATBOT WIDGET
// Powered by Google Gemini AI
// ============================================

class PhishNetChatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.pendingAttachment = null;
    this.init();
  }

  init() {
    // DOM Elements
    this.toggleBtn = document.getElementById('chatbot-toggle');
    this.closeBtn = document.getElementById('chatbot-close');
    this.window = document.getElementById('chatbot-window');
    this.messagesContainer = document.getElementById('chatbot-messages');
    this.input = document.getElementById('chatbot-input');
    this.sendBtn = document.getElementById('chatbot-send');
    // Attach button and file input are added if missing to avoid editing all pages
    this.attachBtn = document.getElementById('chatbot-attach');
    this.fileInput = document.getElementById('chatbot-file');
    this.attachmentPreview = document.getElementById('chatbot-attachment-preview');
    this.typingIndicator = document.getElementById('chatbot-typing');
    this.snapshotBtn = document.getElementById('chatbot-snapshot');

    if (!this.toggleBtn) return; // Exit if chatbot not present on page

    // Event Listeners
    // Inject attachment controls if not present
    this.ensureAttachmentControls();
    this.setLauncherIcon();

    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.close());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.input.addEventListener('paste', (e) => this.handlePaste(e));
    this.snapshotBtn.addEventListener('click', () => this.takeSnapshot());
    this.attachBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Ensure typing indicator always uses the animated dot markup
    if (this.typingIndicator) {
      this.typingIndicator.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    }

    // Load chat history from localStorage
    this.loadHistory();
    this.refreshSeedBotAvatar();
  }

  getBotAvatarSVG() {
    // Heroicons-inspired minimal robot for a professional feel
    return `
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
        <g fill="none" stroke="none" stroke-width="1">
          <rect x="14" y="18" width="36" height="26" rx="10" fill="#0b172a" stroke="#1f2937" stroke-width="1.5" />
          <rect x="20" y="14" width="24" height="6" rx="3" fill="#1f2937" />
          <rect x="18" y="22" width="28" height="12" rx="6" fill="#111827" stroke="#38bdf8" stroke-width="1.25" />
          <circle cx="26" cy="28" r="3" fill="#0b63d9" />
          <circle cx="38" cy="28" r="3" fill="#0b63d9" />
          <circle cx="26" cy="28" r="1.4" fill="#e0f2fe" />
          <circle cx="38" cy="28" r="1.4" fill="#e0f2fe" />
          <path d="M25 35c4 3 10 3 14 0" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
          <rect x="30" y="10" width="4" height="6" rx="2" fill="#38bdf8" />
          <path d="M16 27h-3" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
          <path d="M51 27h-3" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
        </g>
      </svg>`;
  }

  refreshSeedBotAvatar() {
    if (!this.messagesContainer) return;
    const seedAvatar = this.messagesContainer.querySelector('.bot-message .message-avatar');
    if (seedAvatar) {
      seedAvatar.classList.add('bot');
      seedAvatar.innerHTML = this.getBotAvatarSVG();
    }
  }

  // Sanitize text, then apply lightweight markdown for **bold** and line breaks
  renderBotMessage(text) {
    const escapeHtml = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    let safe = escapeHtml(text || '');
    // Bold (**strong**)
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Simple bullet styling: convert leading * to a bullet dot
    safe = safe.replace(/(^|\n)\*\s+/g, '$1<span class="bullet-dot">•</span> ');
    // Preserve newlines
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  setLauncherIcon() {
    if (!this.toggleBtn) return;
    this.toggleBtn.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="bot-bg" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#0b63d9" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="none" stroke-width="1" fill-rule="evenodd">
          <path d="M32 6c-1.105 0-2 .895-2 2v3.1C19.243 11.68 10.5 21.064 10.5 32.5 10.5 44.374 20.126 54 32 54s21.5-9.626 21.5-21.5C53.5 21.064 44.757 11.68 34 11.1V8c0-1.105-.895-2-2-2z" fill="#f8fafc" />
          <path d="M23 52c2.8 3.2 6.28 5 9 5 2.72 0 6.2-1.8 9-5l-9 .5-9-.5z" fill="#f8fafc" />
          <path d="M19 28c0-3.314 2.686-6 6-6h14c3.314 0 6 2.686 6 6v8c0 3.314-2.686 6-6 6H25c-3.314 0-6-2.686-6-6v-8z" fill="url(#bot-bg)" />
          <rect x="30" y="14" width="4" height="6" rx="2" fill="#0b63d9" />
          <rect x="36" y="16" width="4" height="4" rx="1" fill="#0ea5e9" />
          <rect x="24" y="16" width="4" height="4" rx="1" fill="#0ea5e9" />
          <circle class="bot-eye left" cx="26" cy="32" r="3" fill="#38bdf8" />
          <circle class="bot-eye right" cx="38" cy="32" r="3" fill="#38bdf8" />
          <path d="M22 40c2.5 2 5.5 3 10 3s7.5-1 10-3" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
          <path d="M13 32h-3" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" />
          <path d="M54 32h-3" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" />
          <circle cx="32" cy="8" r="2" fill="#0ea5e9" />
        </g>
      </svg>
    `;
  }

  ensureAttachmentControls() {
    // Add attachment button, file input, and preview chip if they are not in the DOM
    const inputArea = this.sendBtn?.parentElement;
    if (!inputArea) return;

    if (!this.attachBtn) {
      this.attachBtn = document.createElement('button');
      this.attachBtn.id = 'chatbot-attach';
      this.attachBtn.className = 'chatbot-attach-btn';
      this.attachBtn.type = 'button';
      this.attachBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a5 5 0 1 1-7.07-7.07l9.2-9.19a3 3 0 0 1 4.24 4.24L9.87 16.17a1 1 0 0 1-1.42-1.42l8.13-8.13" />
        </svg>`;
      inputArea.insertBefore(this.attachBtn, this.sendBtn);
    }

    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = 'image/png,image/jpeg,image/jpg,image/webp';
      this.fileInput.id = 'chatbot-file';
      this.fileInput.style.display = 'none';
      inputArea.appendChild(this.fileInput);
    }

    if (!this.attachmentPreview) {
      this.attachmentPreview = document.createElement('div');
      this.attachmentPreview.id = 'chatbot-attachment-preview';
      this.attachmentPreview.className = 'chatbot-attachment-preview hidden';
      inputArea.parentElement.insertBefore(this.attachmentPreview, inputArea);
    }
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.window.classList.remove('hidden');
    this.isOpen = true;
    this.input.focus();
    this.scrollToBottom();
  }

  close() {
    this.window.classList.add('hidden');
    this.isOpen = false;
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message && !this.pendingAttachment) return;

    // Disable input while processing
    this.input.disabled = true;
    this.sendBtn.disabled = true;

    // Add user message with optional attachment preview
    this.addMessage(message || '[Attachment]', 'user', this.pendingAttachment);
    this.input.value = '';

    // Show typing indicator
    this.showTyping();

    try {
      // Call backend API
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          attachment: this.pendingAttachment || null,
        }),
      });

      const data = await response.json();

      // Hide typing indicator
      this.hideTyping();

      if (data.success) {
        this.addMessage(data.data.reply, 'bot');
      } else {
        this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      }
    } catch (error) {
      this.hideTyping();
      this.addMessage('❌ Unable to connect to the server. Please check your internet connection.', 'bot');
      console.error('Chatbot error:', error);
    } finally {
      // Re-enable input
      this.input.disabled = false;
      this.sendBtn.disabled = false;
      this.input.focus();
    }

    // Save to localStorage
    this.saveHistory();
    // Clear attachment after sending
    this.clearAttachment();
  }

  addMessage(text, sender, attachment = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}-message`;

    const avatar = document.createElement('div');
    avatar.className = sender === 'bot' ? 'message-avatar bot' : 'message-avatar';
    
    if (sender === 'bot') {
      avatar.innerHTML = this.getBotAvatarSVG();
    } else {
      // User avatar - show profile picture if available, otherwise initials
      const userAvatar = this.getUserAvatarURL();
      
      if (userAvatar) {
        // Display profile picture
        avatar.style.backgroundImage = `url('${userAvatar}')`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = ''; // Clear text when showing image
      } else {
        // Fallback to initials or guest icon
        const userInitials = this.getUserInitials();
        avatar.textContent = userInitials;
        avatar.style.fontSize = userInitials === '👤' ? '20px' : '12px';
      }
    }

    const content = document.createElement('div');
    content.className = 'message-content';
    
    const p = document.createElement('p');
    if (sender === 'bot') {
      p.innerHTML = this.renderBotMessage(text);
    } else {
      p.textContent = text;
    }
    content.appendChild(p);

    // Render attachment preview inside the message bubble (images only)
    if (attachment && attachment.dataUrl) {
      const preview = document.createElement('div');
      preview.className = 'chatbot-attachment-thumb';
      const img = document.createElement('img');
      img.src = attachment.dataUrl;
      img.alt = attachment.name || 'attachment';
      preview.appendChild(img);
      const caption = document.createElement('div');
      caption.className = 'chatbot-attachment-caption';
      caption.textContent = attachment.name || 'Image';
      preview.appendChild(caption);
      content.appendChild(preview);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();

    // Store message
    this.messages.push({ text, sender, timestamp: new Date() });
  }

  handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.processAttachmentFile(file);
  }

  handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items || !items.length) return;

    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          this.processAttachmentFile(file);
          break;
        }
      }
    }
  }

  processAttachmentFile(file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select an image file (png, jpg, jpeg, webp).');
      if (this.fileInput) this.fileInput.value = '';
      return;
    }

    const maxSizeMB = 2;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Max size is ${maxSizeMB}MB.`);
      if (this.fileInput) this.fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.pendingAttachment = {
        dataUrl: reader.result,
        name: file.name || 'pasted-image.png',
        mimeType: file.type,
      };
      this.showAttachmentPreview();
    };
    reader.readAsDataURL(file);
  }

  showAttachmentPreview() {
    if (!this.pendingAttachment || !this.attachmentPreview) return;
    this.attachmentPreview.innerHTML = `
      <div class="chatbot-attachment-chip">
        <div class="chip-thumb" style="background-image:url('${this.pendingAttachment.dataUrl}')"></div>
        <div class="chip-text">${this.pendingAttachment.name || 'Image attached'}</div>
        <button class="chip-remove" aria-label="Remove attachment">×</button>
      </div>
    `;
    this.attachmentPreview.classList.remove('hidden');
    const removeBtn = this.attachmentPreview.querySelector('.chip-remove');
    removeBtn?.addEventListener('click', () => this.clearAttachment());
  }

  clearAttachment() {
    this.pendingAttachment = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.attachmentPreview) {
      this.attachmentPreview.innerHTML = '';
      this.attachmentPreview.classList.add('hidden');
    }
  }

  getUserAvatarURL() {
    try {
      // Check if user has uploaded avatar
      const userAvatar = localStorage.getItem('userAvatar');
      if (userAvatar && userAvatar.trim()) {
        return userAvatar;
      }
    } catch (e) {
      console.error('Error getting user avatar:', e);
    }
    return null;
  }

  getUserInitials() {
    try {
      const user = JSON.parse(localStorage.getItem('phishnet_user') || '{}');
      
      // If user is logged in, show their initials
      if (user.initials) return user.initials;
      if (user.firstName && user.lastName) {
        return (user.firstName[0] + user.lastName[0]).toUpperCase();
      }
      if (user.firstName) {
        return user.firstName[0].toUpperCase();
      }
    } catch (e) {
      console.error('Error getting user initials:', e);
    }
    
    // If not logged in, show guest icon
    return '👤';
  }

  showTyping() {
    if (this.typingIndicator) {
      this.typingIndicator.classList.remove('hidden');
      this.scrollToBottom();
    }
  }

  hideTyping() {
    if (this.typingIndicator) {
      this.typingIndicator.classList.add('hidden');
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 100);
  }

  saveHistory() {
    try {
      // Save only last 50 messages to prevent localStorage overflow
      const recentMessages = this.messages.slice(-50);
      localStorage.setItem('phishnet_chat_history', JSON.stringify(recentMessages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }

  loadHistory() {
    try {
      const history = localStorage.getItem('phishnet_chat_history');
      if (history) {
        const messages = JSON.parse(history);
        // Load last 10 messages
        const recentMessages = messages.slice(-10);
        recentMessages.forEach(msg => {
          this.addMessage(msg.text, msg.sender);
        });
        this.messages = messages; // Restore full history for snapshot
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
      // Clear corrupted history
      localStorage.removeItem('phishnet_chat_history');
    }
  }

  takeSnapshot() {
    if (this.messages.length === 0) {
      alert('📭 No messages to snapshot!');
      return;
    }

    // Create formatted chat snapshot
    let chatText = '=== PhishNet Chat Snapshot ===\n';
    chatText += `Generated: ${new Date().toLocaleString()}\n`;
    chatText += '='.repeat(50) + '\n\n';
    
    this.messages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const sender = msg.sender === 'bot' ? 'PhishNet Assistant' : 'You';
      chatText += `[${time}] ${sender}:\n${msg.text}\n\n`;
    });

    chatText += '='.repeat(50) + '\n';
    chatText += 'End of conversation\n';

    // Try to copy to clipboard first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(chatText)
        .then(() => {
          this.showSnapshotSuccess('📋 Chat snapshot copied to clipboard!');
        })
        .catch(() => {
          // Fallback: Download as text file
          this.downloadSnapshot(chatText);
        });
    } else {
      // Fallback for older browsers
      this.downloadSnapshot(chatText);
    }
  }

  downloadSnapshot(text) {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phishnet-chat-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSnapshotSuccess('📥 Chat snapshot downloaded!');
    } catch (e) {
      console.error('Error downloading snapshot:', e);
      alert('❌ Failed to download snapshot. Please try again.');
    }
  }

  showSnapshotSuccess(message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      background: linear-gradient(135deg, #0B63D9, #00B7D9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(11, 99, 217, 0.4);
      z-index: 10000;
      font-family: Inter, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.phishnetChatbot = new PhishNetChatbot();
  });
} else {
  window.phishnetChatbot = new PhishNetChatbot();
}
