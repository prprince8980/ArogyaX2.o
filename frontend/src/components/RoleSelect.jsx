import { User, Stethoscope, FlaskConical, Building2 } from 'lucide-react';

const roles = [
  { 
    label: 'Patient', 
    value: 'patient',
    desc: 'Access your health vault, view medical history & manage family members.',
    icon: User
  },
  { 
    label: 'Doctor / Clinic', 
    value: 'doctor',
    desc: 'Manage appointments, access patient histories & write digital prescriptions.',
    icon: Stethoscope
  },
  { 
    label: 'Laboratory', 
    value: 'laboratory',
    desc: 'Upload diagnostic tests and scan patient identity cards instantly.',
    icon: FlaskConical
  },
  { 
    label: 'Hospital', 
    value: 'hospital',
    desc: 'Coordinate departments, manage doctors & oversee patient ward entries.',
    icon: Building2
  },
];

function RoleSelect({ onSelect }) {
  return (
    <div className="role-select-grid">
      {roles.map((role) => {
        const IconComponent = role.icon;
        return (
          <div
            key={role.value}
            className="role-card"
            onClick={() => onSelect(role.value)}
          >
            <div className="role-icon-box">
              <IconComponent size={24} strokeWidth={2.2} />
            </div>
            <div className="role-card-content">
              <div className="role-title">{role.label}</div>
              <div className="role-desc">{role.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RoleSelect;

