const fs = require('fs');

const files = [
  'src/app/dashboard/customer/profile/page.jsx',
  'src/app/dashboard/vendor/profile/page.jsx'
];

// We prefix the ones without dark: already to avoid doubling
// For simplicity in JS, just do standard regex
const patterns = [
  [/bg-white(?!\sdark:)/g, 'bg-white dark:bg-white'],
  [/bg-gray-50(?!\sdark:)/g, 'bg-gray-50 dark:bg-white'],
  [/text-gray-900(?!\sdark:)/g, 'text-gray-900 dark:text-white'],
  [/text-gray-800(?!\sdark:)/g, 'text-gray-800 dark:text-white'],
  [/text-gray-700(?!\sdark:)/g, 'text-gray-700 dark:text-white'],
  [/text-gray-600(?!\sdark:)/g, 'text-gray-600 dark:text-white'],
  [/text-gray-500(?!\sdark:)/g, 'text-gray-500 dark:text-white'],
  [/border-gray-100(?!\sdark:)/g, 'border-gray-100 dark:border-gray-800'],
  [/border-gray-200(?!\sdark:)/g, 'border-gray-200 dark:border-gray-700'],
  [/border-white(?!\sdark:)/g, 'border-white dark:border-gray-900'],
  [/text-gray-400(?!\sdark:)/g, 'text-gray-400 dark:text-white']
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  patterns.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });

  const useEffectSearch = 'useEffect(() => {\n    fetchProfile();\n  }, []);';
  const useEffectReplace = `useEffect(() => {\n    fetchProfile();\n    const theme = localStorage.getItem("theme");\n    if (theme === "dark") {\n      document.documentElement.classList.add("dark");\n      setSettings(prev => ({...prev, darkMode: true}));\n    }\n  }, []);`;
  if (!content.includes('localStorage.getItem("theme")')) {
    content = content.replace(useEffectSearch, useEffectReplace);
  }

  const handleToggleOld = `const handleToggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));`;
  const handleToggleNew = `const handleToggle = (key) => setSettings(prev => {
    const newVal = !prev[key];
    if (key === 'darkMode') {
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
    return { ...prev, [key]: newVal };
  });`;

  content = content.replace(handleToggleOld, handleToggleNew);

  fs.writeFileSync(file, content);
});

console.log('Processed dark mode classes.');
