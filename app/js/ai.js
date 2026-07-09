/* ===== BizCore ERP - AI Assistant (DeepSeek Integration) ===== */
window.AI = {
  apiKey: null,
  apiUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  chatHistory: [],
  isOpen: false,
  isStreaming: false,

  // ===== KHỞI TẠO =====
  init() {
    this.apiKey = localStorage.getItem('bizcore_ai_key') || (window.BIZCORE_CONFIG && window.BIZCORE_CONFIG.deepseekApiKey) || '';
    this.chatHistory = JSON.parse(localStorage.getItem('bizcore_ai_history') || '[]');
    this.createWidget();
  },

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('bizcore_ai_key', this.apiKey);
  },

  // ===== TẠO WIDGET =====
  createWidget() {
    // Floating Action Button
    const fab = document.createElement('button');
    fab.className = 'ai-fab';
    fab.id = 'aiFab';
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      <div class="ai-fab-badge"></div>
    `;
    fab.addEventListener('click', () => this.togglePanel());
    document.body.appendChild(fab);

    // Chat Panel
    const panel = document.createElement('div');
    panel.className = 'ai-chat-panel hidden';
    panel.id = 'aiChatPanel';
    panel.innerHTML = this._panelHTML();
    document.body.appendChild(panel);

    this._bindEvents();
    if (this.chatHistory.length > 0) this._renderHistory();
  },

  _panelHTML() {
    return `
      <div class="ai-chat-header">
        <div class="ai-chat-header-left">
          <div class="ai-chat-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <div>
            <div class="ai-chat-name">BizCore AI (Agent)</div>
            <div class="ai-chat-status">DeepSeek Tool Calling</div>
          </div>
        </div>
        <div class="ai-chat-header-right">
          <button id="aiSettingsBtn" title="Cài đặt API Key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button id="aiClearBtn" title="Xóa lịch sử">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button id="aiCloseBtn" title="Đóng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="ai-chat-messages" id="aiMessages">
        <div class="ai-msg assistant">
          <div class="ai-msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></div>
          <div>
            <div class="ai-msg-content">
              <p>Xin chào! Tôi là <strong>BizCore Agent</strong> 🤖</p>
              <p>Tôi có thể giúp bạn <strong>phân tích dữ liệu</strong> và <strong>thực thi mệnh lệnh</strong> (như đổi lương, tạo bảng lương, cập nhật Deal). Hãy ra lệnh cho tôi nhé!</p>
            </div>
          </div>
        </div>
      </div>
      <div class="ai-suggestions" id="aiSuggestions">
        <button class="ai-suggestion-chip" data-q="Tăng lương cho Nguyễn Văn An lên 50 triệu">Tăng lương nhân viên</button>
        <button class="ai-suggestion-chip" data-q="Cập nhật deal Saigon Star thành 'won'">Chuyển trạng thái Deal</button>
        <button class="ai-suggestion-chip" data-q="Chấm công (check-in) cho Lê Hoàng Cường">Chấm công hôm nay</button>
      </div>
      <div class="ai-chat-input">
        <textarea id="aiInput" placeholder="Ra lệnh cho BizCore AI..." rows="1"></textarea>
        <button class="ai-send-btn" id="aiSendBtn" title="Gửi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;
  },

  _bindEvents() {
    document.getElementById('aiCloseBtn').addEventListener('click', () => this.togglePanel());
    document.getElementById('aiClearBtn').addEventListener('click', () => this.clearHistory());
    document.getElementById('aiSettingsBtn').addEventListener('click', () => this.showSettings());
    document.getElementById('aiSendBtn').addEventListener('click', () => this.send());

    const input = document.getElementById('aiInput');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    document.getElementById('aiSuggestions').addEventListener('click', (e) => {
      const chip = e.target.closest('.ai-suggestion-chip');
      if (chip) { document.getElementById('aiInput').value = chip.dataset.q; this.send(); }
    });
  },

  _renderHistory() {
    this.chatHistory.forEach(msg => {
      if (msg.role === 'system' || msg.role === 'tool' || msg.tool_calls) return;
      if (msg.content) {
        this._addMessage(msg.role, msg.content);
      }
    });
  },

  // ===== TOGGLE PANEL =====
  togglePanel() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('aiChatPanel');
    panel.classList.toggle('hidden', !this.isOpen);
    if (this.isOpen) {
      if (!this.apiKey) this.showSettings();
      document.getElementById('aiInput').focus();
      this._scrollToBottom();
    }
  },

  // ===== API KEY SETTINGS =====
  showSettings() {
    const messages = document.getElementById('aiMessages');
    const existing = document.getElementById('aiSetupInline');
    if (existing) { existing.remove(); return; }

    const setup = document.createElement('div');
    setup.id = 'aiSetupInline';
    setup.className = 'ai-msg assistant';
    setup.innerHTML = `
      <div class="ai-msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4"/></svg></div>
      <div>
        <div class="ai-msg-content">
          <p><strong>⚙️ Cài đặt API Key</strong></p>
          <p>Nhập DeepSeek API Key của bạn:</p>
          <input type="password" class="ai-key-input" id="aiKeyInput" placeholder="sk-..." value="${this.apiKey || ''}" style="margin:8px 0;width:100%;padding:8px 10px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;font-family:monospace">
          <div style="display:flex;gap:8px;margin-top:4px">
            <button class="btn btn-primary btn-sm" id="aiKeySave">Lưu</button>
            <button class="btn btn-ghost btn-sm" id="aiKeyCancel">Hủy</button>
          </div>
        </div>
      </div>
    `;
    messages.appendChild(setup);
    this._scrollToBottom();

    document.getElementById('aiKeySave').addEventListener('click', () => {
      const key = document.getElementById('aiKeyInput').value.trim();
      if (!key) return;
      this.setApiKey(key);
      setup.remove();
      this._addMessage('assistant', '✅ API Key đã được lưu! Bạn có thể bắt đầu ra lệnh.');
    });
    document.getElementById('aiKeyCancel').addEventListener('click', () => setup.remove());
  },

  // ===== GỬI TIN NHẮN (TOOL CALLING) =====
  async send() {
    const input = document.getElementById('aiInput');
    const msg = input.value.trim();
    if (!msg || this.isStreaming) return;

    if (!this.apiKey) {
      this.showSettings();
      return;
    }

    this._addMessage('user', msg);
    input.value = '';
    input.style.height = 'auto';

    const sugg = document.getElementById('aiSuggestions');
    if (sugg) sugg.style.display = 'none';

    this.chatHistory.push({ role: 'user', content: msg });
    this.isStreaming = true;
    document.getElementById('aiSendBtn').disabled = true;

    try {
      await this._processChatCompletion();
    } catch (err) {
      this._hideTyping();
      this._addMessage('assistant', `❌ **Lỗi API**: ${err.message}`);
    } finally {
      this.isStreaming = false;
      document.getElementById('aiSendBtn').disabled = false;
    }
  },

  async _processChatCompletion(isRecursive = false) {
    if (!isRecursive) this._showTyping();
    
    // Only send the last 10 valid messages to save tokens. Ensure we don't sever tool_calls sequences.
    let apiHistory = this.chatHistory.slice(-10);
    // Remove null values recursively handled by API schema rules
    apiHistory = apiHistory.map(m => {
      const cleaned = { ...m };
      if (!cleaned.content) cleaned.content = "";
      return cleaned;
    });

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: await this._buildSystemPrompt() }, ...apiHistory],
        tools: this._getTools(),
        stream: true,
        temperature: 0.1, // Thấp để AI gọi tool chính xác
        max_tokens: 2000,
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Lỗi HTTP ${response.status}`);
    }

    this._hideTyping();
    let assistantEl = document.getElementById('aiStreamingMsg');
    if (!assistantEl) {
       assistantEl = this._addMessage('assistant', '', true);
       assistantEl.id = 'aiStreamingMsg';
    }
    
    let fullResponse = '';
    let toolCallsMap = {};

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta || {};

          if (delta.content) {
            fullResponse += delta.content;
            this._updateStreamingMessage(assistantEl, fullResponse);
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallsMap[idx]) toolCallsMap[idx] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } };
              if (tc.id) toolCallsMap[idx].id = tc.id;
              if (tc.function?.name) toolCallsMap[idx].function.name = tc.function.name;
              if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
            }
          }
        } catch (e) {}
      }
    }

    const toolCalls = Object.values(toolCallsMap);
    
    if (toolCalls.length > 0) {
      // AI quyết định gọi Tool
      this.chatHistory.push({ role: 'assistant', content: fullResponse || null, tool_calls: toolCalls });
      
      const executionStatus = '\n\n*⚙️ Đang thực thi ' + toolCalls.length + ' lệnh...*';
      this._updateStreamingMessage(assistantEl, fullResponse + executionStatus);
      
      const toolResults = await this._executeToolCalls(toolCalls);
      
      for (const res of toolResults) {
        this.chatHistory.push({ role: 'tool', tool_call_id: res.tool_call_id, name: res.name, content: res.content });
      }

      // Tự động Refresh UI nếu App đang mở page đó
      if (window.App && window.App.currentPage) {
        window.App.renderPage(window.App.currentPage);
      }

      // Đệ quy gọi lại API để AI xác nhận kết quả
      await this._processChatCompletion(true);
    } else {
      // Chat bình thường
      assistantEl.removeAttribute('id'); // Hoàn tất stream
      this._updateStreamingMessage(assistantEl, fullResponse, true); // final render
      this.chatHistory.push({ role: 'assistant', content: fullResponse });
      this._saveHistory();
    }
  },

  // ===== ĐỊNH NGHĨA TOOLS =====
  _getTools() {
    return [
      {
        type: "function",
        function: {
          name: "updateEmployeeSalary",
          description: "Cập nhật lương cơ bản của một nhân viên bằng ID",
          parameters: {
            type: "object",
            properties: {
              employeeId: { type: "string" },
              newSalary: { type: "number" }
            },
            required: ["employeeId", "newSalary"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "updateDealStage",
          description: "Cập nhật trạng thái (stage) của một deal bằng ID",
          parameters: {
            type: "object",
            properties: {
              dealId: { type: "string" },
              newStage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] }
            },
            required: ["dealId", "newStage"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "checkInEmployee",
          description: "Thực hiện check-in chấm công cho nhân viên vào hôm nay",
          parameters: {
            type: "object",
            properties: {
              employeeId: { type: "string" }
            },
            required: ["employeeId"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "createDeal",
          description: "Tạo một cơ hội (deal) mới trong CRM",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Tên cơ hội" },
              value: { type: "number", description: "Giá trị (VNĐ)" },
              stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] }
            },
            required: ["title", "value"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "createCustomer",
          description: "Tạo một khách hàng mới trong CRM",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tên khách hàng/công ty" },
              status: { type: "string", enum: ["lead", "new", "active"] }
            },
            required: ["name"]
          }
        }
      }
    ];
  },

  // ===== THỰC THI LỆNH LÊN STORE =====
  async _executeToolCalls(toolCalls) {
    const results = [];
    const role = Store.currentUser?.role;
    const canManageHR = role === 'admin' || role === 'hr';
    const canManageCRM = role === 'admin' || role === 'manager';

    for (const tc of toolCalls) {
      try {
        const name = tc.function.name;
        const args = JSON.parse(tc.function.arguments);
        let resultData = "";

        if (name === "updateEmployeeSalary") {
          if (!canManageHR) { resultData = "Lỗi: Bạn không có quyền thay đổi lương."; }
          else {
          const emp = await Store.getEmployee(args.employeeId);
          if (emp) {
            await Store.updateEmployee(args.employeeId, { baseSalary: args.newSalary });
            resultData = `Đã cập nhật lương cho ${emp.name} thành ${Utils.formatCurrency(args.newSalary)}`;
          } else {
            resultData = "Lỗi: Không tìm thấy nhân viên.";
          }
          }
        } 
        else if (name === "updateDealStage") {
          if (!canManageCRM) { resultData = "Lỗi: Bạn không có quyền cập nhật deal."; }
          else {
          const deal = await Store.getDeal(args.dealId);
          if (deal) {
            await Store.updateDeal(args.dealId, { stage: args.newStage });
            resultData = `Đã cập nhật deal "${deal.title}" sang trạng thái ${args.newStage}`;
          } else {
            resultData = "Lỗi: Không tìm thấy deal với ID này.";
          }
          }
        }
        else if (name === "checkInEmployee") {
          if (role === 'employee' && Store.currentUser.id !== args.employeeId) {
            resultData = "Lỗi: Bạn chỉ có thể chấm công cho chính mình.";
          } else {
          const emp = await Store.getEmployee(args.employeeId);
          if (emp) {
            const record = await Store.checkIn(args.employeeId);
            resultData = `Đã check-in thành công cho ${emp.name} lúc ${record.checkIn}`;
          } else {
             resultData = "Lỗi: Không tìm thấy nhân viên.";
          }
          }
        }
        else if (name === "createDeal") {
          if (!canManageCRM) { resultData = "Lỗi: Bạn không có quyền tạo deal."; }
          else {
          const d = await Store.addDeal({ title: args.title, value: args.value || 0, stage: args.stage || 'lead' });
          resultData = `Đã tạo cơ hội "${args.title}" (${Utils.formatCurrency(args.value || 0)}) ở giai đoạn ${args.stage || 'lead'}.`;
          }
        }
        else if (name === "createCustomer") {
          if (!canManageCRM) { resultData = "Lỗi: Bạn không có quyền tạo khách hàng."; }
          else {
          await Store.addCustomer({ name: args.name, status: args.status || 'lead' });
          resultData = `Đã tạo khách hàng "${args.name}" (trạng thái ${args.status || 'lead'}).`;
          }
        }
        else {
          resultData = "Lỗi: Hàm không được hỗ trợ.";
        }

        results.push({ tool_call_id: tc.id, name: name, content: resultData });
      } catch (err) {
        results.push({ tool_call_id: tc.id, name: tc.function.name, content: "Lỗi thực thi Exception: " + err.message });
      }
    }
    return results;
  },

  // ===== DATA PROMPT (chat-with-data) =====
  async _buildSystemPrompt() {
    const [employees, deals, departments, customers] = await Promise.all([
      Store.getEmployees(), Store.getDeals(), Store.getDepartments(), Store.getCustomers().catch(() => [])
    ]);
    const month = Utils.getCurrentMonth();
    const payroll = await Store.getPayrollByMonth(month).catch(() => []);
    const payrollTotal = payroll.reduce((s, p) => s + (p.netSalary || p.baseSalary || 0), 0);
    const active = employees.filter(e => e.status === 'active').length;
    const pipeline = deals.reduce((s, d) => s + (d.value || 0), 0);
    const winRate = Utils.calculateWinRate(deals);
    const deptLines = departments.map(dp => `- ${dp.name}: ${employees.filter(e => e.departmentId === dp.id).length} NV`).join('\n');

    return `Bạn là **BizCore AI** — trợ lý điều hành doanh nghiệp (HRM + CRM). Trả lời NGẮN GỌN, TIẾNG VIỆT, kèm số liệu.
Bạn VỪA phân tích dữ liệu công ty, VỪA thực thi mệnh lệnh (gọi hàm).

=== TỔNG QUAN CÔNG TY (để trả lời câu hỏi phân tích) ===
- Nhân sự đang làm: ${active}/${employees.length}
- Quỹ lương tháng ${month}: ${Utils.formatCurrency(payrollTotal)}
- Pipeline: ${Utils.formatCurrency(pipeline)} · Tỷ lệ chốt: ${winRate}% · Số cơ hội: ${deals.length} · Khách hàng: ${customers.length}
PHÒNG BAN:
${deptLines}

=== NHÂN SỰ (ID để gọi hàm) ===
${employees.map(e => `- ID:${e.id} | ${e.name} | ${e.position || ''} | ${Utils.formatCurrency(e.baseSalary)} | ${e.status}`).join('\n')}

=== CƠ HỘI (ID để gọi hàm) ===
${deals.map(d => `- ID:${d.id} | ${d.title} | ${Utils.formatCurrency(d.value)} | ${d.stage}`).join('\n')}

=== KHÁCH HÀNG ===
${customers.map(c => `- ID:${c.id} | ${c.name || ''} | ${c.status || ''}`).join('\n')}

=== HƯỚNG DẪN ===
1. Hỏi phân tích ("phòng nào đông nhất", "quỹ lương bao nhiêu", "deal nào sắp mất", "so sánh…") → trả lời dựa trên dữ liệu trên.
2. Yêu cầu thay đổi (đổi lương/stage, chấm công, TẠO deal/khách) → GỌI HÀM với ID chính xác. KHÔNG bịa ID.
3. "Đánh giá deal/khách hàng" → phân tích rủi ro/tiềm năng, cho điểm 1–10 + lý do ngắn.
`;
  },

  // ===== UI HELPERS =====
  _addMessage(role, content, isStreaming = false) {
    const messages = document.getElementById('aiMessages');
    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const avatarContent = role === 'assistant'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>'
      : 'Bạn';

    div.innerHTML = `
      <div class="ai-msg-avatar">${avatarContent}</div>
      <div>
        <div class="ai-msg-content">${isStreaming ? '<span class="ai-typing"><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span></span>' : this._formatMarkdown(content)}</div>
        <div class="ai-msg-time">${time}</div>
      </div>
    `;

    messages.appendChild(div);
    this._scrollToBottom();
    return div;
  },

  _updateStreamingMessage(el, content, isFinal = false) {
    const contentEl = el.querySelector('.ai-msg-content');
    if (contentEl) {
      contentEl.innerHTML = this._formatMarkdown(content) + (isFinal ? '' : '<span class="ai-typing" style="display:inline-flex;margin-left:4px"><span class="ai-typing-dot"></span></span>');
      this._scrollToBottom();
    }
  },

  _showTyping() {
    if (document.getElementById('aiTypingIndicator')) return;
    const el = document.createElement('div');
    el.id = 'aiTypingIndicator';
    el.className = 'ai-msg assistant';
    el.innerHTML = `
      <div class="ai-msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></div>
      <div><div class="ai-msg-content"><span class="ai-typing"><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span></span></div></div>
    `;
    document.getElementById('aiMessages').appendChild(el);
    this._scrollToBottom();
  },

  _hideTyping() {
    const el = document.getElementById('aiTypingIndicator');
    if (el) el.remove();
  },

  _scrollToBottom() {
    const el = document.getElementById('aiMessages');
    if (el) el.scrollTop = el.scrollHeight;
  },

  _formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\s*[-*]\s+(.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^\s*(\d+)\.\s+(.+)/gm, '<li>$2</li>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1');
  },

  clearHistory() {
    this.chatHistory = [];
    localStorage.removeItem('bizcore_ai_history');
    const messages = document.getElementById('aiMessages');
    messages.innerHTML = `
      <div class="ai-msg assistant">
        <div class="ai-msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></div>
        <div><div class="ai-msg-content"><p>Lịch sử đã được xóa. Hãy ra lệnh cho tôi! 🔄</p></div></div>
      </div>
    `;
    const sugg = document.getElementById('aiSuggestions');
    if (sugg) sugg.style.display = 'flex';
    Components.showToast('Đã xóa lịch sử chat AI', 'info');
  },

  _saveHistory() {
    // Keep only last 20 messages, filter out tool_calls to save localstorage space if needed, 
    // but we need tool_calls for context. Just save everything for simplicity.
    if (this.chatHistory.length > 20) this.chatHistory = this.chatHistory.slice(-20);
    localStorage.setItem('bizcore_ai_history', JSON.stringify(this.chatHistory));
  },
};
