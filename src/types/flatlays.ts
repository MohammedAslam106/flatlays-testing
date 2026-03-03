


export interface FlatlayColor {
    name: string
    hex: string
}

export interface FlatlayMetadata {
    name: string
    gender?: string
    category?: string
    subcategory?: string
    seasons?: string[]
    colors?: FlatlayColor[]
    fabric?: string
    occasions?: string[]
    pattern?: string
    tags?: string[]
    // allow extra fields from future responses
    [key: string]: unknown
}

export interface FlatlayGarment {
    slot: string
    image_url: string
    metadata: FlatlayMetadata
}

export interface FlatlayResultItem {
    jobId: string
    batchId: string
    image: string
    gender?: string
    garments: FlatlayGarment[]
}

export interface FlatlayBatchResult {
    success: boolean
    batchId: string
    results: FlatlayResultItem[]
}

// export default FlatlayBatchResult


export const dummyData = [
    {
        "jobId": "0e5618ec-1438-4ac0-b815-77747c6cdf1c",
        "batchId": "705f6c3e-b230-4674-8d2d-ade1e28587bf",
        "image": "https://bespoke-media.s3.ap-south-1.amazonaws.com/af412e9e-cd52-4c94-8767-8310fbbf7e45-images (2).jpeg",
        "gender": "man",
        "garments": [
            {
                "slot": "bottom",
                "image_url": "https://bespoke-media.s3.ap-south-1.amazonaws.com/flatlays/4c579a8a-1a98-4b62-b5d2-82fb408fac05/d2b05d4c-5b6b-43f5-8a34-d455dcfc1c0a.png",
                "metadata": {
                    "name": "Men's Blue Regular Fit Jeans",
                    "gender": "men",
                    "category": "Bottoms",
                    "subcategory": "Jeans",
                    "seasons": [
                        "Spring",
                        "Summer",
                        "Autumn",
                        "All year"
                    ],
                    "colors": [
                        {
                            "name": "Blue",
                            "hex": "#4682B4"
                        }
                    ],
                    "fabric": "Denim",
                    "occasions": [
                        "Casual outing",
                        "Everyday errands",
                        "Coffee date",
                        "Travel"
                    ],
                    "pattern": "Solid",
                    "tags": [
                        "denim",
                        "casual",
                        "blue jeans",
                        "men's jeans",
                        "everyday"
                    ]
                }
            }
        ],
    },

    {
        "jobId": "0e5618ec-1438-4ac0-b815-77747c6cdf1c",
        "batchId": "705f6c3e-b230-4674-8d2d-ade1e28587bf",
        "image": "https://bespoke-media.s3.ap-south-1.amazonaws.com/af412e9e-cd52-4c94-8767-8310fbbf7e45-images (2).jpeg",
        "gender": "man",
        "garments": [
            {
                "slot": "bottom",
                "image_url": "https://bespoke-media.s3.ap-south-1.amazonaws.com/flatlays/4c579a8a-1a98-4b62-b5d2-82fb408fac05/d2b05d4c-5b6b-43f5-8a34-d455dcfc1c0a.png",
                "metadata": {
                    "name": "Men's Blue Regular Fit Jeans",
                    "gender": "men",
                    "category": "Bottoms",
                    "subcategory": "Jeans",
                    "seasons": [
                        "Spring",
                        "Summer",
                        "Autumn",
                        "All year"
                    ],
                    "colors": [
                        {
                            "name": "Blue",
                            "hex": "#4682B4"
                        }
                    ],
                    "fabric": "Denim",
                    "occasions": [
                        "Casual outing",
                        "Everyday errands",
                        "Coffee date",
                        "Travel"
                    ],
                    "pattern": "Solid",
                    "tags": [
                        "denim",
                        "casual",
                        "blue jeans",
                        "men's jeans",
                        "everyday"
                    ]
                }
            }
        ]
    }
]

