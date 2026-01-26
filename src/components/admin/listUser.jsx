import React, { useState } from 'react';
import '../../layout/admin/listUser.css';

export const dummyUsers = [
  {
    fullName: 'Đặng Hoàng Trúc Vy',
    username: 'Vy Dang',
    phone: '0965782358',
    role: 'Administrator',
    createdAt: '15/01/2026',
    password: '0965782358',
  },
  {
    fullName: 'Baomini',
    username: 'Baomini',
    phone: '0965782358',
    role: 'Rescue Coordinator',
    createdAt: '15/01/2026',
    password: '0965782358',
  },
  {
    fullName: 'Vũ Nguyễn Đức Huy',
    username: 'Huy Vũ',
    phone: '0965782358',
    role: 'Rescue Team',
    createdAt: '15/01/2026',
    password: '0965782358',
  },
  {
    fullName: 'Trương Trần Anh Minh',
    username: 'Minh Trương',
    phone: '0789543210',
    role: 'Manager',
    createdAt: '25/01/2026',
    password: '30062005',
  },
];

const ListUser = () => {
  const [users, setUsers] = useState(dummyUsers);
  const [toast, setToast] = useState({
    show: false,
    message: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  const handleDelete = (username) => {
  const confirmed = window.confirm('Bạn có chắc muốn xóa tài khoản này?');
  if (confirmed) {
    setUsers(prev => prev.filter(user => user.username !== username));

    // Hiện toast
    setToast({
      show: true,
      message: `Đã xóa thành công tài khoản ${username}`,
    });

    // Tự ẩn sau 3 giây
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
  }
};

const handleResetPassword = (username) => {
  const confirmed = window.confirm(
    'Bạn có chắc muốn reset mật khẩu về 123 không?'
  );

  if (confirmed) {
    setUsers(prev =>
      prev.map(user =>
        user.username === username
          ? { ...user, password: '123' }
          : user
      )
    );

    // Toast thông báo
    setToast({
      show: true,
      message: `Đã reset mật khẩu tài khoản ${username} về 123`,
    });

    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
  }
};


  const filteredUsers = users.filter(user => {
    const matchSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'All' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="list-user-container">
      <h2>Account Management</h2>

      <div className="controls">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="All">Tất cả chức vụ</option>
          <option value="Administrator">Administrator</option>
          <option value="Manager">Manager</option>
          <option value="Rescue Coordinator">Rescue Coordinator</option>
          <option value="Rescue Team">Rescue Team</option>
        </select>
        <button>Tìm kiếm</button>
      </div>

      <div className="user-list">
        {filteredUsers.map((user, idx) => (
          <div key={idx} className="user-card">
            <p><strong>Họ và tên:</strong> {user.fullName}</p>
            <p><strong>Tên đăng nhập:</strong> {user.username}</p>
            <p><strong>Số điện thoại:</strong> {user.phone}</p>
            <p><strong>Chức vụ:</strong> {user.role}</p>
            <p><strong>Ngày tạo tài khoản:</strong> {user.createdAt}</p>
            <p><strong>Mật khẩu:</strong> {user.password}</p>
            <div className="actions">
              <button className="delete-btn" onClick={() => handleDelete(user.username)}>Delete Account</button>
              <button className="reset-btn"
                      onClick={() => 
                      handleResetPassword(user.username)}
              >Reset Password
              </button>
            </div>
          </div>
        ))}
      </div>
      {toast.show && (
        <div className="toast">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ListUser;