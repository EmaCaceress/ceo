import { useEffect, useMemo, useState, useRef } from "react";
import "./AdminPanel.scss";
import { enabledUsersReq, users } from "../../server/server";

interface User {
  id: number;
  username: string;
  role: string;
  email: string;
  enabled: boolean;
}

const AdminPanel = () => {
  const [keyValue, setKeyValue] = useState("");
  const [search, setSearch] = useState("");
  const [enabledUsers, setEnabledUsers] = useState<number[]>([]);
  const [mockUsers, setMockUsers] = useState<User[]>([]);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    users().then((data) => setMockUsers(data));
  }, []);

  useEffect(() => {
    const enabled = mockUsers.filter((user) => user.enabled).map((u) => u.id);
    setEnabledUsers(enabled);
  }, [mockUsers]);
  
  const filteredUsers = useMemo(() => { 
    return mockUsers.filter((user: User) => 
      user.username.includes(search.toLowerCase())
    ); 
  }, [search, mockUsers]);
  
  const toggleUser = (id: number) => {
    setEnabledUsers((prev) =>
      prev.includes(id)
        ? prev.filter((userId) => userId !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = () => {
    enabledUsersReq(keyValue, enabledUsers);
  };

  return (
    <section className="admin-panel">
      <div className="admin-card">
        <h2>Panel Admin</h2>

        <div className="input-group">
          <label>Ingresar clave</label>

          <input
            type="text"
            placeholder="argentina-berazategui-sur-red"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
          />
        </div>
        <div className="admin-panel__list">
          <div className="input-group">
            <label>Buscar usuario</label>

            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="users-list">
            {filteredUsers.map((user) => (
              
              <div className="user-item" key={user.id}>
                <div className="user-info">
                  <span>{user.username}</span>
                  <small>{user.role}</small>
                </div>

                <label className="switch">
                  <input
                    type="checkbox"
                    checked={enabledUsers.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>


        <button className="save-btn" onClick={handleSubmit}>
          Guardar clave
        </button>
      </div>
    </section>
  );
};

export default AdminPanel;