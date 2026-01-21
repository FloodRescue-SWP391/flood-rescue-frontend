import React, { useState } from 'react';
import '../../layout/admin/createUser.css';

const CreateUser = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Rescue Coordinator',
  });

  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }

    console.log("User created:", formData);

    setSuccessMessage('✅ Create account successfully!');

    setFormData({
      fullName: '',
      username: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'Rescue Coordinator',
    });

    // tự động ẩn sau 3s
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="create-user-container">
      <h2>Create New Account</h2>

      {successMessage && (
        <div className="toast toast-success">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form">

          {/* ROLE */}
          <div className="form-row1">
            <label>Select Role:</label>
            <div className="role-group">

              <label className="role-item">
                <input
                  type="radio"
                  name="role"
                  value="Rescue Coordinator"
                  checked={formData.role === 'Rescue Coordinator'}
                  onChange={handleChange}
                />
                Rescue Coordinator
              </label>

              <label className="role-item">
                <input
                  type="radio"
                  name="role"
                  value="Rescue Team"
                  checked={formData.role === 'Rescue Team'}
                  onChange={handleChange}
                />
                Rescue Team
              </label>

              <label className="role-item">
                <input
                  type="radio"
                  name="role"
                  value="Manager"
                  checked={formData.role === 'Manager'}
                  onChange={handleChange}
                />
                Manager
              </label>

            </div>
          </div>

          <div className="form-row">
            <label>User Name:</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label>Login Name:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label>Phone Number:</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label>Create Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label>Confirm Password:</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button type="submit">Create New Account</button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default CreateUser;
