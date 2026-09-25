import Papa from 'papaparse';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export interface ParsedLeadsResult {
  emails: string[];
  totalDetected: number;
  fileName?: string;
  errors?: string[];
}

export const parseLeadFile = (file: File): Promise<ParsedLeadsResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        return resolve({ emails: [], totalDetected: 0, fileName: file.name });
      }

      const foundEmails = new Set<string>();

      // Strategy 1: Parse using PapaParse if CSV
      if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            results.data.forEach((row: any) => {
              if (Array.isArray(row)) {
                row.forEach((cell) => {
                  if (typeof cell === 'string') {
                    const matches = cell.match(EMAIL_REGEX);
                    if (matches) {
                      matches.forEach((email) => foundEmails.add(email.toLowerCase().trim()));
                    }
                  }
                });
              } else if (typeof row === 'object' && row !== null) {
                Object.values(row).forEach((cell: any) => {
                  if (typeof cell === 'string') {
                    const matches = cell.match(EMAIL_REGEX);
                    if (matches) {
                      matches.forEach((email) => foundEmails.add(email.toLowerCase().trim()));
                    }
                  }
                });
              }
            });

            const emailsArray = Array.from(foundEmails);
            resolve({
              emails: emailsArray,
              totalDetected: emailsArray.length,
              fileName: file.name,
            });
          },
          error: (_err: any) => {
            // Fallback regex parsing on raw text
            const matches = content.match(EMAIL_REGEX) || [];
            matches.forEach((m) => foundEmails.add(m.toLowerCase().trim()));
            const emailsArray = Array.from(foundEmails);
            resolve({
              emails: emailsArray,
              totalDetected: emailsArray.length,
              fileName: file.name,
            });
          },
        });
      } else {
        // Strategy 2: Plain text regex matching
        const matches = content.match(EMAIL_REGEX) || [];
        matches.forEach((m) => foundEmails.add(m.toLowerCase().trim()));
        const emailsArray = Array.from(foundEmails);
        resolve({
          emails: emailsArray,
          totalDetected: emailsArray.length,
          fileName: file.name,
        });
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};
