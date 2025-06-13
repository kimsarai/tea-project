// Configuration
const API_BASE_URL = 'https://80.ide.lab.daas.co.jp/api'; // FastAPI server URL
        
// Progress tracking
let currentStep = 1;
const totalSteps = 3;

// Data storage
let allProducts = [];
let filteredProducts = [];

// Initialize data on page load
async function initializeData() {
    try {
        // Fetch all products and features
        await Promise.all([
            fetchAllProducts(),
        ]);
        
        // Initialize filtered products with all products
        filteredProducts = [...allProducts];
        
        console.log(filteredProducts);
        console.log('Data initialized:', {
            products: allProducts.length,
        });
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Fetch all products from API
async function fetchAllProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/product?limit=1000`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        allProducts = await response.json();
        return allProducts;
    } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to empty array if API fails
        allProducts = [];
        throw error;
    }
}



// Get feature for a specific product ID
async function getFeature(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/feature/${productId}`);
        
        if (!response.ok) {
            console.log("BBBBBBBBBBBBBBB");
            console.warn(`Feature not found for product ID: ${productId}`);
            return null;
        }

        const feature = await response.json();
        return feature;
    } catch (error) {
        console.error(`Error fetching feature for product ${productId}:`, error);
        return null;
    }
}

// Map user selection to feature attribute names
function mapSelectionToFeatureAttribute(featureType, featureValue) {
    const featureMapping = {
        'taste': {
            '甘い': 'sweetness',      // sweet
            '苦い': 'bitterness',     // bitter
            '酸っぱい': 'acidity',    // sour/acidic
            '渋い': 'tannic'          // astringent/tannic
        },
        'mood': {
            'リラックス': 'sweetness', // relax - sweet
            'エネルギッシュ': 'richness', // energetic - rich
            '集中': 'bitterness',     // focus - bitter
            '癒し': 'fruity'          // healing - fruity
        }
    };

    return featureMapping[featureType]?.[featureValue] || null;
}

// Filter products based on user selection
async function filterProductsByFeature(featureType, featureValue) {
    const featureAttribute = mapSelectionToFeatureAttribute(featureType, featureValue);
    
    if (!featureAttribute) {
        console.warn(`No feature mapping found for: ${featureType} = ${featureValue}`);
        return;
    }

    console.log(`Filtering by ${featureType}:${featureValue} -> ${featureAttribute}`);
    
    // Filter products asynchronously
    const matchingProducts = [];
    
    for (const product of filteredProducts) {
        try {
            const feature = await getFeature(product.id);
            
            if (feature && feature[featureAttribute] === 1) {
                matchingProducts.push(product);
            }
        } catch (error) {
            console.error(`Error checking feature for product ${product.id}:`, error);
            // Continue with other products even if one fails
        }
    }
    
    filteredProducts = matchingProducts;
    console.log(`Filtered by ${featureType}:${featureValue}, remaining products:`, filteredProducts.length);
}

// Update progress bar
function updateProgress(step) {
    const percentage = (step / totalSteps) * 100;
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `${step} / ${totalSteps}`;
}

// Validate current step
function validateStep(step) {
    let isValid = false;
    
    switch(step) {
        case 1:
            isValid = document.querySelector('input[name="taste"]:checked') !== null;
            break;
        case 2:
            isValid = document.querySelector('input[name="time"]:checked') !== null;
            break;
        case 3:
            isValid = document.querySelector('input[name="mood"]:checked') !== null;
            break;
    }
    
    if (!isValid) {
        alert('選択肢を選んでください。');
    }
    
    return isValid;
}

// Navigate to next step
async function nextStep(step) {
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Show loading while filtering
    showLoading();
    
    try {
        // Apply filter based on current step
        await applyCurrentStepFilter();
        
        // Hide loading and show next step
        hideLoading();
        document.getElementById(`step${currentStep}`).style.display = 'none';
        document.getElementById(`step${step}`).style.display = 'block';
        currentStep = step;
        updateProgress(step);
    } catch (error) {
        console.error('Error during filtering:', error);
        hideLoading();
        showError();
    }
}

// Navigate to previous step
async function prevStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    document.getElementById(`step${step}`).style.display = 'block';
    currentStep = step;
    updateProgress(step);
    
    // Reset filters when going back
    await resetFiltersToStep(step);
}

// Apply filter based on current step selection
async function applyCurrentStepFilter() {
    const currentSelection = getCurrentStepSelection();
    
    if (currentSelection) {
        await filterProductsByFeature(currentSelection.type, currentSelection.value);
    }
}

// Get current step selection
function getCurrentStepSelection() {
    switch(currentStep) {
        case 1:
            const taste = document.querySelector('input[name="taste"]:checked')?.value;
            return taste ? { type: 'taste', value: taste } : null;
        case 2:
            const time = document.querySelector('input[name="time"]:checked')?.value;
            return time ? { type: 'time', value: time } : null;
        case 3:
            const mood = document.querySelector('input[name="mood"]:checked')?.value;
            return mood ? { type: 'mood', value: mood } : null;
        default:
            return null;
    }
}

// Reset filters to a specific step
async function resetFiltersToStep(targetStep) {
    // Reset to all products
    filteredProducts = [...allProducts];
    
    // Reapply filters up to the target step
    const formData = collectFormData();
    
    try {
        if (targetStep >= 1 && formData.taste) {
            await filterProductsByFeature('taste', formData.taste);
        }
        if (targetStep >= 2 && formData.time) {
            await filterProductsByFeature('time', formData.time);
        }
        if (targetStep >= 3 && formData.mood) {
            await filterProductsByFeature('mood', formData.mood);
        }
    } catch (error) {
        console.error('Error resetting filters:', error);
    }
}

// Collect form data
function collectFormData() {
    const taste = document.querySelector('input[name="taste"]:checked')?.value;
    const time = document.querySelector('input[name="time"]:checked')?.value;
    const mood = document.querySelector('input[name="mood"]:checked')?.value;
    
    return {
        taste: taste,
        time: time,
        mood: mood
    };
}

// Show loading state
function showLoading() {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show error message
function showError() {
    hideLoading();
    document.getElementById('error').style.display = 'block';
}

// Get random recommendation from filtered products
function getRandomRecommendation() {
    if (filteredProducts.length === 0) {
        return null;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredProducts.length);
    return filteredProducts[randomIndex];
}

// Display result
function displayResult(teaData) {
    if (!teaData) {
        // Show no results message
        document.getElementById('teaName').textContent = '申し訳ございません';
        document.getElementById('teaDescription').textContent = 'お客様の条件に合うお茶が見つかりませんでした。条件を変えて再度お試しください。';
        document.getElementById('teaPrice').textContent = '';
        document.getElementById('teaCategory').textContent = '';
        
        const teaImage = document.getElementById('teaImage');
        teaImage.src = 'https://source.unsplash.com/300x300/?tea,question';
        teaImage.alt = 'No tea found';
    } else {
        // Update result display with product data
        document.getElementById('teaName').textContent = teaData.product_name || 'おすすめのお茶';
        document.getElementById('teaDescription').textContent = teaData.description || 'あなたの好みにぴったりのお茶です。';
        document.getElementById('teaPrice').textContent = teaData.price ? `¥${teaData.price}` : '¥0';
        document.getElementById('teaCategory').textContent = teaData.category || 'お茶';
        
        // Set tea image - decode base64 if available
        const teaImage = document.getElementById('teaImage');
        if (teaData.image_data) {
            teaImage.src = `data:image/jpeg;base64,${teaData.image_data}`;
            teaImage.alt = teaData.product_name;
        } else {
            teaImage.src = 'https://source.unsplash.com/300x300/?tea,cup';
            teaImage.alt = 'Tea';
        }
    }

    // Show result
    hideLoading();
    document.getElementById('result').style.display = 'block';
    
    // Update progress to 100%
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressText').textContent = '完了';
    
    // Log final results for debugging
    console.log('Final filtered products:', filteredProducts.length);
    console.log('Selected product:', teaData);
}

// Main function to show result
async function showResult() {
    if (!validateStep(currentStep)) {
        return;
    }

    // Show loading
    showLoading();

    try {
        // Apply final filter
        await applyCurrentStepFilter();
        
        // Small delay to show loading animation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get recommendation from filtered products
        const recommendedTea = getRandomRecommendation();
        
        // Display the result
        displayResult(recommendedTea);

    } catch (error) {
        console.error('Error during diagnosis:', error);
        showError();
    }
}

// Restart diagnosis
function restartDiagnosis() {
    // Reset form
    document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.checked = false;
    });

    // Hide all steps and show first step
    document.querySelectorAll('.question-step').forEach(step => {
        step.style.display = 'none';
    });
    document.getElementById('step1').style.display = 'block';
    document.getElementById('error').style.display = 'none';

    // Reset progress
    currentStep = 1;
    updateProgress(1);
    
    // Reset filtered products
    filteredProducts = [...allProducts];
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    updateProgress(1);
    
    // Initialize data from API
    try {
        await initializeData();
    } catch (error) {
        console.error('Failed to initialize data:', error);
        // You might want to show an error message to the user here
    }
});

// Utility function to show all remaining products (for debugging)
function showRemainingProducts() {
    console.log('Remaining products after filtering:', filteredProducts);
    return filteredProducts;
}