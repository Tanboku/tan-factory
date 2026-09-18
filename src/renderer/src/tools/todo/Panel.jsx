import React, { useEffect, useRef, useState } from 'react';

let uid = Date.now();
const nid = () => `${uid++}-${Math.random().toString(36).slice(2, 7)}`;

export default function TodoPanel() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const loaded = useRef(false);

  // 载入持久化数据
  useEffect(() => {
    window.api.store.get('todos', []).then((v) => {
      setTodos(Array.isArray(v) ? v : []);
      loaded.current = true;
      inputRef.current?.focus();
    });
  }, []);

  // 防抖保存
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => window.api.store.set('todos', todos), 250);
    return () => clearTimeout(t);
  }, [todos]);

  const add = () => {
    const v = text.trim();
    if (!v) return;
    setTodos((l) => [{ id: nid(), text: v, done: false, at: Date.now() }, ...l]);
    setText('');
  };

  const toggle = (id) => setTodos((l) => l.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const del = (id) => setTodos((l) => l.filter((t) => t.id !== id));

  const left = todos.filter((t) => !t.done).length;
  const done = todos.length - left;

  return (
    <div className="todo-panel">
      <div className="todo-input-row">
        <input
          ref={inputRef}
          className="todo-input"
          value={text}
          placeholder="要做什么？回车添加"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="todo-add" onClick={add} disabled={!text.trim()}>
          添加
        </button>
      </div>

      {todos.length > 0 && (
        <div className="todo-stat">
          <span>🥕 待办 {left} 项</span>
          {done > 0 && (
            <button className="todo-clear" onClick={() => setTodos((l) => l.filter((t) => !t.done))}>
              清除已完成 {done} 项
            </button>
          )}
        </div>
      )}

      <div className="todo-list">
        {todos.map((t) => (
          <div className={`todo-item ${t.done ? 'done' : ''}`} key={t.id}>
            <button className="todo-check" onClick={() => toggle(t.id)} title={t.done ? '标记未完成' : '标记完成'}>
              {t.done ? '✓' : ''}
            </button>
            <span className="todo-text">{t.text}</span>
            <button className="todo-del" onClick={() => del(t.id)} title="删除">
              ✕
            </button>
          </div>
        ))}
        {!todos.length && (
          <div className="empty-state small">
            <span className="empty-face">🥕</span>
            <p>今天还没有待办，从一件小事开始吧</p>
          </div>
        )}
      </div>
    </div>
  );
}
