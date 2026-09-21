import { createTheme } from '@mui/material/styles';

export const chibiTheme = createTheme({
  palette: {
    primary: {
      main: '#FF85A1', // Sweet Sakura Pink from logo
      light: '#FFD6E8',
      dark: '#E65A80',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#6B9BC8', // Pastel Denim Blue from logo hair and brand text
      light: '#D8EDFC',
      dark: '#4A7AA7',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFE680', // Butter Yellow
      light: '#FFF5C2',
      dark: '#E6C84D',
      contrastText: '#2D3548',
    },
    success: {
      main: '#A3E7D0', // Soft Pastel Mint
      light: '#D4F6EB',
      dark: '#6DBB9F',
      contrastText: '#2D3548',
    },
    info: {
      main: '#D1C4FD', // Pastel Lavender
      light: '#EBE5FE',
      dark: '#A684F5',
      contrastText: '#2D3548',
    },
    background: {
      default: '#F4F9FE',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2D3548',
      secondary: '#616D86',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Fredoka", "Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: '"Fredoka", "Plus Jakarta Sans", sans-serif',
      fontWeight: 800,
      color: '#2D3548',
    },
    h2: {
      fontFamily: '"Fredoka", "Plus Jakarta Sans", sans-serif',
      fontWeight: 800,
      color: '#2D3548',
    },
    h3: {
      fontFamily: '"Fredoka", "Plus Jakarta Sans", sans-serif',
      fontWeight: 800,
      color: '#2D3548',
    },
    h4: {
      fontFamily: '"Fredoka", "Plus Jakarta Sans", sans-serif',
      fontWeight: 800,
      color: '#2D3548',
    },
    h5: {
      fontFamily: '"Fredoka", "Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      color: '#2D3548',
    },
    h6: {
      fontFamily: '"Fredoka", "Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      color: '#2D3548',
    },
    subtitle1: {
      fontWeight: 700,
      color: '#2D3548',
    },
    subtitle2: {
      fontWeight: 700,
      color: '#2D3548',
    },
    body1: {
      color: '#2D3548',
    },
    body2: {
      color: '#2D3548',
    },
    button: {
      fontWeight: 800,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: '8px 18px',
          fontWeight: 800,
          border: '2px solid #2D3548',
          boxShadow: '2px 2px 0px #2D3548',
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translate(-1px, -1px)',
            boxShadow: '4px 4px 0px #2D3548',
          },
          '&:active': {
            transform: 'translate(1px, 1px)',
            boxShadow: '1px 1px 0px #2D3548',
          },
          '&.MuiButton-containedPrimary': {
            backgroundColor: '#FF85A1',
            color: '#FFFFFF',
            border: '2px solid #2D3548',
            '&:hover': {
              backgroundColor: '#FF6B8D',
            },
          },
          '&.MuiButton-containedSecondary': {
            backgroundColor: '#6B9BC8',
            color: '#FFFFFF',
            border: '2px solid #2D3548',
            '&:hover': {
              backgroundColor: '#5588B9',
            },
          },
          '&.MuiButton-outlined': {
            backgroundColor: '#FFFFFF',
            color: '#2D3548',
            borderColor: '#2D3548',
            borderWidth: 2,
            '&:hover': {
              backgroundColor: '#F4F9FE',
              borderColor: '#2D3548',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          border: '3px solid #2D3548',
          boxShadow: '4px 4px 0px #2D3548',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          color: '#2D3548',
        },
        rounded: {
          borderRadius: 20,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          borderRadius: 10,
          border: '2px solid #2D3548',
          color: '#2D3548',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#2D3548',
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: '#2D3548',
              borderWidth: 2,
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6B9BC8',
              borderWidth: 3,
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 700,
            color: '#616D86',
            '&.Mui-focused': {
              color: '#2D3548',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          border: '4px solid #2D3548',
          boxShadow: '8px 8px 0px #2D3548',
        },
      },
    },
  },
});

