package dlp

import "regexp"

type rule struct {
	re          *regexp.Regexp
	replacement string
}

// rules is the ordered DLP pipeline. Applied sequentially.
var rules = []rule{
	{
		re:          regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
		replacement: "[REDACTED_AKIA]",
	},
	{
		re:          regexp.MustCompile(`sk-[A-Za-z0-9]{20,}`),
		replacement: "[REDACTED_OPENAI]",
	},
	{
		re:          regexp.MustCompile(`AIza[0-9A-Za-z_\-]{20,}`),
		replacement: "[REDACTED_GOOGLE]",
	},
	{
		// PEM blocks (multi-line handled via (?s) flag)
		re:          regexp.MustCompile(`(?s)-----BEGIN [A-Z ]+-----.*?-----END [A-Z ]+-----`),
		replacement: "[REDACTED_PEM]",
	},
	{
		re:          regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`),
		replacement: "[REDACTED_EMAIL]",
	},
}

// Redact applies all DLP patterns to text and returns sanitized output.
// Order matters: specific patterns (AKIA, sk-) before generic ones (email).
func Redact(text string) string {
	for _, r := range rules {
		text = r.re.ReplaceAllString(text, r.replacement)
	}
	return text
}
