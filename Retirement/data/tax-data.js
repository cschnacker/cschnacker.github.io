/* Generated from data/tax-2026.json; edit the JSON source. */
window.TaxData = {
  "schemaVersion": 1,
  "year": 2026,
  "releaseId": "2026-existing-model",
  "status": "active-local",
  "description": "Existing local model tables separated without activating new tax rates.",
  "sources": [
    {
      "name": "Existing local SpreadsheetConverter-derived model",
      "retrieved": "2026-09-12"
    },
    {
      "name": "IRS Publication 505 (2026), federal schedules",
      "url": "https://www.irs.gov/publications/p505"
    }
  ],
  "federal": {
    "schedules": {
      "Single": [
        {
          "upper": 12400,
          "rate": 10
        },
        {
          "upper": 50400,
          "rate": 12
        },
        {
          "upper": 105700,
          "rate": 22
        },
        {
          "upper": 201775,
          "rate": 24
        },
        {
          "upper": 256225,
          "rate": 32
        },
        {
          "upper": 640600,
          "rate": 35
        },
        {
          "upper": null,
          "rate": 37
        }
      ],
      "Joint": [
        {
          "upper": 24800,
          "rate": 10
        },
        {
          "upper": 100800,
          "rate": 12
        },
        {
          "upper": 211400,
          "rate": 22
        },
        {
          "upper": 403550,
          "rate": 24
        },
        {
          "upper": 512450,
          "rate": 32
        },
        {
          "upper": 768700,
          "rate": 35
        },
        {
          "upper": null,
          "rate": 37
        }
      ],
      "Separate": [
        {
          "upper": 12400,
          "rate": 10
        },
        {
          "upper": 50400,
          "rate": 12
        },
        {
          "upper": 105700,
          "rate": 22
        },
        {
          "upper": 201775,
          "rate": 24
        },
        {
          "upper": 256225,
          "rate": 32
        },
        {
          "upper": 384350,
          "rate": 35
        },
        {
          "upper": null,
          "rate": 37
        }
      ],
      "HoH": [
        {
          "upper": 17700,
          "rate": 10
        },
        {
          "upper": 67450,
          "rate": 12
        },
        {
          "upper": 105700,
          "rate": 22
        },
        {
          "upper": 201750,
          "rate": 24
        },
        {
          "upper": 256200,
          "rate": 32
        },
        {
          "upper": 640600,
          "rate": 35
        },
        {
          "upper": null,
          "rate": 37
        }
      ]
    },
    "filingMap": {
      "Single": "Single",
      "Joint": "Joint",
      "Separate": "Separate",
      "HoH": "HoH"
    }
  },
  "states": {
    "Alabama": {
      "schedules": {
        "Single": [
          {
            "upper": 500,
            "rate": 2
          },
          {
            "upper": 3000,
            "rate": 4
          },
          {
            "upper": null,
            "rate": 5
          }
        ],
        "Joint": [
          {
            "upper": 1000,
            "rate": 2
          },
          {
            "upper": 6000,
            "rate": 4
          },
          {
            "upper": null,
            "rate": 5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Alaska": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Arizona": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 2.5
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 2.5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Arkansas": {
      "schedules": {
        "Single": [
          {
            "upper": 4600,
            "rate": 2
          },
          {
            "upper": null,
            "rate": 3.9
          }
        ],
        "Joint": [
          {
            "upper": 4600,
            "rate": 2
          },
          {
            "upper": null,
            "rate": 3.9
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "California": {
      "schedules": {
        "Single": [
          {
            "upper": 11079,
            "rate": 1
          },
          {
            "upper": 26264,
            "rate": 2
          },
          {
            "upper": 41452,
            "rate": 4
          },
          {
            "upper": 57542,
            "rate": 6
          },
          {
            "upper": 72724,
            "rate": 8
          },
          {
            "upper": 371479,
            "rate": 9.3
          },
          {
            "upper": 445771,
            "rate": 10.3
          },
          {
            "upper": 742953,
            "rate": 11.3
          },
          {
            "upper": 1000000,
            "rate": 12.3
          },
          {
            "upper": null,
            "rate": 13.3
          }
        ],
        "Joint": [
          {
            "upper": 22158,
            "rate": 1
          },
          {
            "upper": 52528,
            "rate": 2
          },
          {
            "upper": 82904,
            "rate": 4
          },
          {
            "upper": 115084,
            "rate": 6
          },
          {
            "upper": 145448,
            "rate": 8
          },
          {
            "upper": 742958,
            "rate": 9.3
          },
          {
            "upper": 891542,
            "rate": 10.3
          },
          {
            "upper": 1000000,
            "rate": 11.3
          },
          {
            "upper": 1485906,
            "rate": 12.3
          },
          {
            "upper": null,
            "rate": 13.3
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Colorado": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 4.4
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 4.4
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Connecticut": {
      "schedules": {
        "Single": [
          {
            "upper": 10000,
            "rate": 2
          },
          {
            "upper": 50000,
            "rate": 4.5
          },
          {
            "upper": 100000,
            "rate": 5.5
          },
          {
            "upper": 200000,
            "rate": 6
          },
          {
            "upper": 250000,
            "rate": 6.9
          },
          {
            "upper": 500000,
            "rate": 6.99
          },
          {
            "upper": null,
            "rate": 6.99
          }
        ],
        "Joint": [
          {
            "upper": 20000,
            "rate": 2
          },
          {
            "upper": 100000,
            "rate": 4.5
          },
          {
            "upper": 200000,
            "rate": 5.5
          },
          {
            "upper": 400000,
            "rate": 6
          },
          {
            "upper": 500000,
            "rate": 6.9
          },
          {
            "upper": 1000000,
            "rate": 6.99
          },
          {
            "upper": null,
            "rate": 6.99
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Delaware": {
      "schedules": {
        "Single": [
          {
            "upper": 5000,
            "rate": 2.2
          },
          {
            "upper": 10000,
            "rate": 3.9
          },
          {
            "upper": 20000,
            "rate": 4.8
          },
          {
            "upper": 25000,
            "rate": 5.2
          },
          {
            "upper": 60000,
            "rate": 5.55
          },
          {
            "upper": null,
            "rate": 6.6
          }
        ],
        "Joint": [
          {
            "upper": 5000,
            "rate": 2.2
          },
          {
            "upper": 10000,
            "rate": 3.9
          },
          {
            "upper": 20000,
            "rate": 4.8
          },
          {
            "upper": 25000,
            "rate": 5.2
          },
          {
            "upper": 60000,
            "rate": 5.55
          },
          {
            "upper": null,
            "rate": 6.6
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Florida": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Georgia": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 5.19
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 5.19
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Hawaii": {
      "schedules": {
        "Single": [
          {
            "upper": 9600,
            "rate": 1.4
          },
          {
            "upper": 14400,
            "rate": 3.2
          },
          {
            "upper": 19200,
            "rate": 5.5
          },
          {
            "upper": 24000,
            "rate": 6.4
          },
          {
            "upper": 36000,
            "rate": 6.8
          },
          {
            "upper": 48000,
            "rate": 7.2
          },
          {
            "upper": 125000,
            "rate": 7.6
          },
          {
            "upper": 175000,
            "rate": 7.9
          },
          {
            "upper": 225000,
            "rate": 8.25
          },
          {
            "upper": 275000,
            "rate": 9
          },
          {
            "upper": 325000,
            "rate": 10
          }
        ],
        "Joint": [
          {
            "upper": 19200,
            "rate": 1.4
          },
          {
            "upper": 28800,
            "rate": 3.2
          },
          {
            "upper": 38400,
            "rate": 5.5
          },
          {
            "upper": 48000,
            "rate": 6.4
          },
          {
            "upper": 72000,
            "rate": 6.8
          },
          {
            "upper": 96000,
            "rate": 7.2
          },
          {
            "upper": 250000,
            "rate": 7.6
          },
          {
            "upper": 350000,
            "rate": 7.9
          },
          {
            "upper": 450000,
            "rate": 8.25
          },
          {
            "upper": 550000,
            "rate": 9
          },
          {
            "upper": 650000,
            "rate": 10
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Idaho": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 5.3
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 5.3
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Illinois": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 4.95
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 4.95
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Indiana": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 2.95
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 2.95
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Iowa": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 3.8
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 3.8
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Kansas": {
      "schedules": {
        "Single": [
          {
            "upper": 23000,
            "rate": 5.2
          },
          {
            "upper": null,
            "rate": 5.58
          }
        ],
        "Joint": [
          {
            "upper": 46000,
            "rate": 5.2
          },
          {
            "upper": null,
            "rate": 5.58
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Kentucky": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 3.5
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 3.5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Louisiana": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 3
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 3
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Maine": {
      "schedules": {
        "Single": [
          {
            "upper": 27399,
            "rate": 5.8
          },
          {
            "upper": 64849,
            "rate": 6.75
          },
          {
            "upper": null,
            "rate": 7.15
          }
        ],
        "Joint": [
          {
            "upper": 54849,
            "rate": 5.8
          },
          {
            "upper": 129749,
            "rate": 6.75
          },
          {
            "upper": null,
            "rate": 7.15
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Maryland": {
      "schedules": {
        "Single": [
          {
            "upper": 1000,
            "rate": 2
          },
          {
            "upper": 2000,
            "rate": 3
          },
          {
            "upper": 3000,
            "rate": 4
          },
          {
            "upper": 100000,
            "rate": 4.75
          },
          {
            "upper": 125000,
            "rate": 5
          },
          {
            "upper": 150000,
            "rate": 5.25
          },
          {
            "upper": 250000,
            "rate": 5.5
          },
          {
            "upper": 500000,
            "rate": 5.75
          },
          {
            "upper": 1000000,
            "rate": 6.25
          },
          {
            "upper": null,
            "rate": 6.5
          }
        ],
        "Joint": [
          {
            "upper": 1000,
            "rate": 2
          },
          {
            "upper": 2000,
            "rate": 3
          },
          {
            "upper": 3000,
            "rate": 4
          },
          {
            "upper": 150000,
            "rate": 4.75
          },
          {
            "upper": 175000,
            "rate": 5
          },
          {
            "upper": 225000,
            "rate": 5.25
          },
          {
            "upper": 300000,
            "rate": 5.5
          },
          {
            "upper": 600000,
            "rate": 5.75
          },
          {
            "upper": 1200000,
            "rate": 6.25
          },
          {
            "upper": null,
            "rate": 6.5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Massachusetts": {
      "schedules": {
        "Single": [
          {
            "upper": 1083150,
            "rate": 5
          },
          {
            "upper": null,
            "rate": 9
          }
        ],
        "Joint": [
          {
            "upper": 1083150,
            "rate": 5
          },
          {
            "upper": null,
            "rate": 9
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Michigan": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 4.25
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 4.25
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Minnesota": {
      "schedules": {
        "Single": [
          {
            "upper": 33310,
            "rate": 5.35
          },
          {
            "upper": 109430,
            "rate": 6.8
          },
          {
            "upper": 203150,
            "rate": 7.85
          },
          {
            "upper": null,
            "rate": 9.85
          }
        ],
        "Joint": [
          {
            "upper": 48700,
            "rate": 5.35
          },
          {
            "upper": 193480,
            "rate": 6.8
          },
          {
            "upper": 337930,
            "rate": 7.85
          },
          {
            "upper": null,
            "rate": 9.85
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Mississippi": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 4
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 4
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Missouri": {
      "schedules": {
        "Single": [
          {
            "upper": 2696,
            "rate": 2
          },
          {
            "upper": 4044,
            "rate": 2.5
          },
          {
            "upper": 5392,
            "rate": 3
          },
          {
            "upper": 6740,
            "rate": 3.5
          },
          {
            "upper": 8088,
            "rate": 4
          },
          {
            "upper": 9436,
            "rate": 4.5
          },
          {
            "upper": null,
            "rate": 4.7
          }
        ],
        "Joint": [
          {
            "upper": 2696,
            "rate": 2
          },
          {
            "upper": 4044,
            "rate": 2.5
          },
          {
            "upper": 5392,
            "rate": 3
          },
          {
            "upper": 6740,
            "rate": 3.5
          },
          {
            "upper": 8088,
            "rate": 4
          },
          {
            "upper": 9436,
            "rate": 4.5
          },
          {
            "upper": null,
            "rate": 4.7
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Montana": {
      "schedules": {
        "Single": [
          {
            "upper": 47500,
            "rate": 4.7
          },
          {
            "upper": null,
            "rate": 5.65
          }
        ],
        "Joint": [
          {
            "upper": 95000,
            "rate": 4.7
          },
          {
            "upper": null,
            "rate": 5.65
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Nebraska": {
      "schedules": {
        "Single": [
          {
            "upper": 4130,
            "rate": 2.46
          },
          {
            "upper": 24760,
            "rate": 3.51
          },
          {
            "upper": null,
            "rate": 4.55
          }
        ],
        "Joint": [
          {
            "upper": 8250,
            "rate": 2.46
          },
          {
            "upper": 49530,
            "rate": 3.51
          },
          {
            "upper": null,
            "rate": 4.55
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Nevada": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "New Hampshire": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "New Jersey": {
      "schedules": {
        "Single": [
          {
            "upper": 20000,
            "rate": 1.4
          },
          {
            "upper": 35000,
            "rate": 2.45
          },
          {
            "upper": 40000,
            "rate": 3.5
          },
          {
            "upper": 75000,
            "rate": 5.53
          },
          {
            "upper": 500000,
            "rate": 6.37
          },
          {
            "upper": 1000000,
            "rate": 8.97
          },
          {
            "upper": null,
            "rate": 10.75
          }
        ],
        "Joint": [
          {
            "upper": 20000,
            "rate": 1.4
          },
          {
            "upper": 50000,
            "rate": 1.75
          },
          {
            "upper": 70000,
            "rate": 2.45
          },
          {
            "upper": 80000,
            "rate": 3.5
          },
          {
            "upper": 150000,
            "rate": 5.53
          },
          {
            "upper": 500000,
            "rate": 6.37
          },
          {
            "upper": 1000000,
            "rate": 8.97
          },
          {
            "upper": null,
            "rate": 10.75
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "New Mexico": {
      "schedules": {
        "Single": [
          {
            "upper": 5500,
            "rate": 1.5
          },
          {
            "upper": 16500,
            "rate": 3.2
          },
          {
            "upper": 33500,
            "rate": 4.3
          },
          {
            "upper": 66500,
            "rate": 4.7
          },
          {
            "upper": 210000,
            "rate": 4.9
          },
          {
            "upper": null,
            "rate": 5.9
          }
        ],
        "Joint": [
          {
            "upper": 8000,
            "rate": 1.5
          },
          {
            "upper": 25000,
            "rate": 3.2
          },
          {
            "upper": 50000,
            "rate": 4.3
          },
          {
            "upper": 100000,
            "rate": 4.7
          },
          {
            "upper": 315000,
            "rate": 4.9
          },
          {
            "upper": null,
            "rate": 5.9
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "New York": {
      "schedules": {
        "Single": [
          {
            "upper": 8500,
            "rate": 3.9
          },
          {
            "upper": 11700,
            "rate": 4.4
          },
          {
            "upper": 13900,
            "rate": 5.15
          },
          {
            "upper": 80650,
            "rate": 5.4
          },
          {
            "upper": 215400,
            "rate": 5.9
          },
          {
            "upper": 1077550,
            "rate": 6.85
          },
          {
            "upper": 5000000,
            "rate": 9.65
          },
          {
            "upper": 25000000,
            "rate": 10.3
          },
          {
            "upper": null,
            "rate": 10.9
          }
        ],
        "Joint": [
          {
            "upper": 17150,
            "rate": 3.9
          },
          {
            "upper": 23600,
            "rate": 4.4
          },
          {
            "upper": 27900,
            "rate": 5.15
          },
          {
            "upper": 161550,
            "rate": 5.4
          },
          {
            "upper": 323200,
            "rate": 5.9
          },
          {
            "upper": 2155350,
            "rate": 6.85
          },
          {
            "upper": 5000000,
            "rate": 9.65
          },
          {
            "upper": 25000000,
            "rate": 10.3
          },
          {
            "upper": null,
            "rate": 10.9
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "North Carolina": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 3.99
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 3.99
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "North Dakota": {
      "schedules": {
        "Single": [
          {
            "upper": 244825,
            "rate": 1.95
          },
          {
            "upper": null,
            "rate": 2.5
          }
        ],
        "Joint": [
          {
            "upper": 298075,
            "rate": 1.95
          },
          {
            "upper": null,
            "rate": 2.5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Ohio": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 2.75
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 2.75
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Oklahoma": {
      "schedules": {
        "Single": [
          {
            "upper": 4900,
            "rate": 2.5
          },
          {
            "upper": 7200,
            "rate": 3.5
          },
          {
            "upper": null,
            "rate": 4.5
          }
        ],
        "Joint": [
          {
            "upper": 9800,
            "rate": 2.5
          },
          {
            "upper": 14400,
            "rate": 3.5
          },
          {
            "upper": null,
            "rate": 4.5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Oregon": {
      "schedules": {
        "Single": [
          {
            "upper": 4550,
            "rate": 4.75
          },
          {
            "upper": 11400,
            "rate": 6.75
          },
          {
            "upper": 125000,
            "rate": 8.75
          },
          {
            "upper": null,
            "rate": 9.9
          }
        ],
        "Joint": [
          {
            "upper": 9100,
            "rate": 4.75
          },
          {
            "upper": 22800,
            "rate": 6.75
          },
          {
            "upper": 250000,
            "rate": 8.75
          },
          {
            "upper": null,
            "rate": 9.9
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Pennsylvania": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 3.07
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 3.07
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Rhode Island": {
      "schedules": {
        "Single": [
          {
            "upper": 82050,
            "rate": 3.75
          },
          {
            "upper": 186450,
            "rate": 4.75
          },
          {
            "upper": null,
            "rate": 5.99
          }
        ],
        "Joint": [
          {
            "upper": 82050,
            "rate": 3.75
          },
          {
            "upper": 186450,
            "rate": 4.75
          },
          {
            "upper": null,
            "rate": 5.99
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "South Carolina": {
      "schedules": {
        "Single": [
          {
            "upper": 3640,
            "rate": 0
          },
          {
            "upper": 18230,
            "rate": 3
          },
          {
            "upper": null,
            "rate": 6
          }
        ],
        "Joint": [
          {
            "upper": 3640,
            "rate": 0
          },
          {
            "upper": 18230,
            "rate": 3
          },
          {
            "upper": null,
            "rate": 6
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "South Dakota": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Tennessee": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Texas": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Utah": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 4.5
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 4.5
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Vermont": {
      "schedules": {
        "Single": [
          {
            "upper": 49400,
            "rate": 3.35
          },
          {
            "upper": 119700,
            "rate": 6.6
          },
          {
            "upper": 249700,
            "rate": 7.6
          },
          {
            "upper": null,
            "rate": 8.75
          }
        ],
        "Joint": [
          {
            "upper": 82500,
            "rate": 3.35
          },
          {
            "upper": 199450,
            "rate": 6.6
          },
          {
            "upper": 304000,
            "rate": 7.6
          },
          {
            "upper": null,
            "rate": 8.75
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Virginia": {
      "schedules": {
        "Single": [
          {
            "upper": 3000,
            "rate": 2
          },
          {
            "upper": 5000,
            "rate": 3
          },
          {
            "upper": 17000,
            "rate": 5
          },
          {
            "upper": null,
            "rate": 5.75
          }
        ],
        "Joint": [
          {
            "upper": 3000,
            "rate": 2
          },
          {
            "upper": 5000,
            "rate": 3
          },
          {
            "upper": 17000,
            "rate": 5
          },
          {
            "upper": null,
            "rate": 5.75
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Washington": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "West Virginia": {
      "schedules": {
        "Single": [
          {
            "upper": 10000,
            "rate": 2.22
          },
          {
            "upper": 25000,
            "rate": 2.96
          },
          {
            "upper": 40000,
            "rate": 3.33
          },
          {
            "upper": 60000,
            "rate": 4.44
          },
          {
            "upper": null,
            "rate": 4.82
          }
        ],
        "Joint": [
          {
            "upper": 10000,
            "rate": 2.22
          },
          {
            "upper": 25000,
            "rate": 2.96
          },
          {
            "upper": 40000,
            "rate": 3.33
          },
          {
            "upper": 60000,
            "rate": 4.44
          },
          {
            "upper": null,
            "rate": 4.82
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Wisconsin": {
      "schedules": {
        "Single": [
          {
            "upper": 15110,
            "rate": 3.5
          },
          {
            "upper": 51950,
            "rate": 4.4
          },
          {
            "upper": 332720,
            "rate": 5.3
          },
          {
            "upper": null,
            "rate": 7.65
          }
        ],
        "Joint": [
          {
            "upper": 20150,
            "rate": 3.5
          },
          {
            "upper": 69260,
            "rate": 4.4
          },
          {
            "upper": 443630,
            "rate": 5.3
          },
          {
            "upper": null,
            "rate": 7.65
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "Wyoming": {
      "schedules": {
        "Single": [
          {
            "upper": null,
            "rate": 0
          }
        ],
        "Joint": [
          {
            "upper": null,
            "rate": 0
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    },
    "D.C.": {
      "schedules": {
        "Single": [
          {
            "upper": 10000,
            "rate": 4
          },
          {
            "upper": 40000,
            "rate": 6
          },
          {
            "upper": 60000,
            "rate": 6.5
          },
          {
            "upper": 250000,
            "rate": 8.5
          },
          {
            "upper": 500000,
            "rate": 9.25
          },
          {
            "upper": 1000000,
            "rate": 9.75
          },
          {
            "upper": null,
            "rate": 10.75
          }
        ],
        "Joint": [
          {
            "upper": 10000,
            "rate": 4
          },
          {
            "upper": 40000,
            "rate": 6
          },
          {
            "upper": 60000,
            "rate": 6.5
          },
          {
            "upper": 250000,
            "rate": 8.5
          },
          {
            "upper": 500000,
            "rate": 9.25
          },
          {
            "upper": 1000000,
            "rate": 9.75
          },
          {
            "upper": null,
            "rate": 10.75
          }
        ]
      },
      "filingMap": {
        "Single": "Single",
        "Joint": "Joint",
        "Separate": "Single",
        "HoH": "Single"
      },
      "notes": [
        "Inherited state data, not independently updated. Separate and head-of-household retain the original single-bracket approximation."
      ]
    }
  }
};
