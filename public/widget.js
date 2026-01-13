/**
 * Poverty Stoplight Chat Widget
 * 
 * This script is injected into Superset pages via nginx sub_filter.
 * It creates a floating chat button that opens an iframe to the chatbot.
 * 
 * The widget reads user info from Superset's bootstrap data to pass
 * user context to the chatbot.
 */
(function() {
  'use strict';

  // Prevent double initialization
  if (window.__PSP_CHAT_WIDGET_LOADED__) return;
  window.__PSP_CHAT_WIDGET_LOADED__ = true;

  // Configuration
  var config = {
    // In development, chatbot runs on localhost:3000
    // In production, this would be the production chatbot URL
    chatUrl: window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : 'https://chat.' + window.location.hostname.replace(/^www\./, ''),
    widgetPath: '/widget',
    buttonSize: 60,
    containerWidth: 400,
    containerHeight: 600,
    zIndex: 9999
  };

  // Get user info from Superset's bootstrap data
  function getUserInfo() {
    try {
      var bootstrap = window.__SUPERSET_BOOTSTRAP_DATA__ || {};
      var user = bootstrap.user || {};
      return {
        userId: user.userId || '',
        username: ((user.firstName || '') + ' ' + (user.lastName || '')).trim(),
        email: user.email || ''
      };
    } catch (e) {
      console.warn('[PSP Chat Widget] Could not read user info:', e);
      return { userId: '', username: '', email: '' };
    }
  }

  // Build widget URL with user params
  function getWidgetUrl() {
    var user = getUserInfo();
    var params = new URLSearchParams();
    if (user.userId) params.set('userId', user.userId);
    if (user.username) params.set('username', user.username);
    if (user.email) params.set('email', user.email);
    
    var queryString = params.toString();
    return config.chatUrl + config.widgetPath + (queryString ? '?' + queryString : '');
  }

  // Create styles
  function createStyles() {
    var style = document.createElement('style');
    style.textContent = '\n' +
      '#psp-chat-btn {\n' +
      '  position: fixed;\n' +
      '  bottom: 20px;\n' +
      '  right: 20px;\n' +
      '  width: ' + config.buttonSize + 'px;\n' +
      '  height: ' + config.buttonSize + 'px;\n' +
      '  border-radius: 50%;\n' +
      '  background-color: #1890ff;\n' +
      '  color: white;\n' +
      '  border: none;\n' +
      '  font-size: 24px;\n' +
      '  cursor: pointer;\n' +
      '  z-index: ' + config.zIndex + ';\n' +
      '  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n' +
      '  transition: transform 0.2s ease-in-out, background-color 0.2s;\n' +
      '  display: flex;\n' +
      '  align-items: center;\n' +
      '  justify-content: center;\n' +
      '}\n' +
      '#psp-chat-btn:hover {\n' +
      '  transform: scale(1.05);\n' +
      '  background-color: #40a9ff;\n' +
      '}\n' +
      '#psp-chat-btn svg {\n' +
      '  width: 28px;\n' +
      '  height: 28px;\n' +
      '  fill: currentColor;\n' +
      '}\n' +
      '#psp-chat-container {\n' +
      '  position: fixed;\n' +
      '  bottom: ' + (config.buttonSize + 30) + 'px;\n' +
      '  right: 20px;\n' +
      '  width: ' + config.containerWidth + 'px;\n' +
      '  height: ' + config.containerHeight + 'px;\n' +
      '  border-radius: 12px;\n' +
      '  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);\n' +
      '  z-index: ' + config.zIndex + ';\n' +
      '  overflow: hidden;\n' +
      '  display: none;\n' +
      '  background: white;\n' +
      '}\n' +
      '#psp-chat-container.open {\n' +
      '  display: block;\n' +
      '}\n' +
      '#psp-chat-iframe {\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  border: none;\n' +
      '}\n' +
      '@media (max-width: 480px) {\n' +
      '  #psp-chat-container {\n' +
      '    width: calc(100vw - 40px);\n' +
      '    height: calc(100vh - 120px);\n' +
      '    bottom: 90px;\n' +
      '    right: 20px;\n' +
      '  }\n' +
      '}\n';
    document.head.appendChild(style);
  }

  // SVG icons
  var icons = {
    chat: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
  };

  // Create widget elements
  function createWidget() {
    // Container
    var container = document.createElement('div');
    container.id = 'psp-chat-container';
    
    // Iframe (lazy loaded)
    var iframe = document.createElement('iframe');
    iframe.id = 'psp-chat-iframe';
    iframe.title = 'Poverty Stoplight AI Assistant';
    container.appendChild(iframe);
    
    // Button
    var button = document.createElement('button');
    button.id = 'psp-chat-btn';
    button.setAttribute('aria-label', 'Toggle Chat Assistant');
    button.innerHTML = icons.chat;
    
    // State
    var isOpen = false;
    var iframeLoaded = false;
    
    // Toggle handler
    button.addEventListener('click', function() {
      isOpen = !isOpen;
      
      if (isOpen) {
        // Lazy load iframe on first open
        if (!iframeLoaded) {
          iframe.src = getWidgetUrl();
          iframeLoaded = true;
        }
        container.classList.add('open');
        button.innerHTML = icons.close;
        button.setAttribute('aria-label', 'Close Chat Assistant');
      } else {
        container.classList.remove('open');
        button.innerHTML = icons.chat;
        button.setAttribute('aria-label', 'Open Chat Assistant');
      }
    });
    
    // Append to body
    document.body.appendChild(container);
    document.body.appendChild(button);
  }

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        createStyles();
        createWidget();
      });
    } else {
      createStyles();
      createWidget();
    }
  }

  // Initialize the widget
  init();

})();
