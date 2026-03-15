import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const SearchableSelect = ({ options, value, onChange, placeholder, isClearable = false, required = false, className = '', onCreate }) => {
  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      border: state.isFocused ? '1px solid hsl(var(--primary))' : '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '4px',
      color: 'hsl(var(--text-main))',
      boxShadow: state.isFocused ? '0 0 0 4px hsla(var(--primary-glow))' : 'none',
      transition: 'var(--transition)',
      '&:hover': {
        borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsla(var(--primary), 0.5)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--bg-surface))',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '4px',
      zIndex: 9999, // Extremely high to bypass portal layers
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--primary))' 
        : state.isFocused 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'transparent',
      color: state.isSelected ? 'white' : 'hsl(var(--text-main))',
      borderRadius: 'var(--radius-xs)',
      padding: '10px 16px',
      cursor: 'pointer',
      fontSize: '0.95rem',
      '&:active': {
        backgroundColor: 'hsla(var(--primary), 0.8)',
      },
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--text-main))',
      fontSize: '1rem',
    }),
    input: (base) => ({
      ...base,
      color: 'hsl(var(--text-main))',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--text-muted))',
      fontSize: '0.95rem',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--text-muted))',
      '&:hover': {
        color: 'hsl(var(--text-main))',
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--text-muted))',
      '&:hover': {
        color: 'hsl(var(--danger))',
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: 'var(--glass-border)',
    }),
  };

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || null;

  const handleCreate = async (inputValue) => {
    if (onCreate) {
        const newOption = await onCreate(inputValue);
        if (newOption) {
            onChange({ target: { name: '', value: newOption.id || newOption.name || newOption.value } });
        }
    }
  };

  const SelectComponent = onCreate ? CreatableSelect : Select;

  return (
    <div className={className} style={{ position: 'relative' }}>
      <SelectComponent
        options={options}
        value={selectedOption}
        onChange={(val) => onChange({ target: { name: '', value: val ? val.value : '' } })}
        onCreateOption={onCreate ? handleCreate : undefined}
        placeholder={placeholder}
        isClearable={isClearable}
        styles={customStyles}
        formatCreateLabel={(inputValue) => `+ Add "${inputValue}"`}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: '100%',
            height: 0,
            position: 'absolute',
            bottom: 0,
            left: 0,
            pointerEvents: 'none'
          }}
          value={value || ''}
          onChange={() => {}}
          required={required}
        />
      )}
    </div>
  );
};

export default SearchableSelect;
