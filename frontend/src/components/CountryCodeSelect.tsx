/**
 * CountryCodeSelect — dropdown of the 3 supported country codes.
 * Used on login & register pages alongside a phone number input.
 */
import { COUNTRY_CODES } from '../context/I18nContext';

interface Props {
  value: string;
  onChange: (code: string, country: string) => void;
}

export default function CountryCodeSelect({ value, onChange }: Props) {
  return (
    <select
      className="form-input cc-select"
      value={value}
      onChange={(e) => {
        const opt = COUNTRY_CODES.find((c) => c.code === e.target.value) || COUNTRY_CODES[0];
        onChange(opt.code, opt.country);
      }}
      aria-label="Country code"
    >
      {COUNTRY_CODES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code}
        </option>
      ))}
    </select>
  );
}
