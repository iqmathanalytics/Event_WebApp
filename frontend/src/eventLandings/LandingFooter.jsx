export default function LandingFooter({ footer }) {
  if (!footer) return null;

  return (
    <footer className="el-footer">
      <div className="el-container">
        {footer.recap ? <p className="el-footer__recap">{footer.recap}</p> : null}

        {footer.columns?.length ? (
          <div className="el-footer__grid">
            {footer.columns.map((col) => (
              <div className="el-footer__col" key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {(col.links || []).map((link) => (
                    <li key={`${col.title}-${link.label}`}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        <div className="el-footer__bottom">
          <p>{footer.legal || ""}</p>
          {footer.socials?.length ? (
            <div className="el-footer__socials">
              {footer.socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
